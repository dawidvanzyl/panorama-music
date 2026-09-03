using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Students.Application.Commands.WaitingList;
using PanoramaMusic.Students.Application.Handlers.WaitingList;
using PanoramaMusic.Students.Application.Requests.WaitingList;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Application;

public class CaptureWaitingListStudentHandlerTests : IClassFixture<StudentsTestFixture>
{
	private readonly StudentsTestContext _context;
	private readonly CaptureWaitingListStudentHandler _handler;

	public CaptureWaitingListStudentHandlerTests(StudentsTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<CaptureWaitingListStudentHandler>();
	}

	[Fact]
	[Trait("AC", "293UC1")]
	public async Task HandleAsync_ValidRequest_CreatesTheStudentAndExactlyOneWaitingListEntry()
	{
		var lessonStructure = LessonStructureFactory.Create();
		SetupLessonStructure(lessonStructure);
		SetupNoOtherEntries();

		var request = ValidRequest(lessonStructure.LessonStructureId);

		var result = await _handler.HandleAsync(
			new CaptureWaitingListStudentCommand(request),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.ShouldNotBeNull(),
			() => result.FirstName.ShouldBe("Amara"),
			() => result.LastName.ShouldBe("Pillay"),
			() => _context.Repositories.StudentRepositoryMock.Verify(
				r => r.CreateAsync(It.IsAny<Student>(), TestContext.Current.CancellationToken), Times.Once),
			() => _context.Repositories.WaitingListRepositoryMock.Verify(
				r => r.CreateAsync(It.IsAny<WaitingListEntry>(), TestContext.Current.CancellationToken), Times.Once));
		// No course-enrollment repository is touched at all — the type this
		// handler returns carries no course reference to begin with.
	}

	[Fact]
	[Trait("AC", "293UC2")]
	public async Task HandleAsync_ValidRequest_AddedAtIsAssignedFromTheServerClockNotTheRequest()
	{
		var lessonStructure = LessonStructureFactory.Create();
		SetupLessonStructure(lessonStructure);
		SetupNoOtherEntries();

		var before = DateTime.UtcNow;
		var request = ValidRequest(lessonStructure.LessonStructureId);

		WaitingListEntry? persisted = null;
		_context.Repositories.WaitingListRepositoryMock
			.Setup(r => r.CreateAsync(It.IsAny<WaitingListEntry>(), It.IsAny<CancellationToken>()))
			.Callback<WaitingListEntry, CancellationToken>((entry, _) => persisted = entry)
			.Returns(Task.CompletedTask);

		await _handler.HandleAsync(new CaptureWaitingListStudentCommand(request), TestContext.Current.CancellationToken);
		var after = DateTime.UtcNow;

		// CaptureWaitingListStudentRequest carries no added-date member at all —
		// there is nothing on it a caller could have supplied — and the value the
		// handler actually persisted falls inside the call's own window, proving
		// it came from the clock rather than being hard-coded or left at default.
		ShouldlyHelpers.Satisfy(
			() => persisted.ShouldNotBeNull(),
			() => persisted!.AddedAt.ShouldBeGreaterThanOrEqualTo(before),
			() => persisted!.AddedAt.ShouldBeLessThanOrEqualTo(after));
	}

	[Fact]
	[Trait("AC", "293UC3")]
	public async Task HandleAsync_LessonStructureIdThatDoesNotExist_IsRejectedAndNothingIsCreated()
	{
		_context.Repositories.LessonStructureRepositoryMock
			.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync((LessonStructure?)null);

		var request = ValidRequest(Guid.NewGuid());

		await Should.ThrowAsync<DomainException>(() =>
			_handler.HandleAsync(new CaptureWaitingListStudentCommand(request), TestContext.Current.CancellationToken));

		ShouldlyHelpers.Satisfy(
			() => _context.Repositories.StudentRepositoryMock.Verify(
				r => r.CreateAsync(It.IsAny<Student>(), It.IsAny<CancellationToken>()), Times.Never),
			() => _context.Repositories.WaitingListRepositoryMock.Verify(
				r => r.CreateAsync(It.IsAny<WaitingListEntry>(), It.IsAny<CancellationToken>()), Times.Never));
	}

	[Fact]
	[Trait("AC", "293UC5")]
	public async Task HandleAsync_NoNotesSupplied_TheEntryIsCreatedWithNotesAbsent()
	{
		var lessonStructure = LessonStructureFactory.Create();
		SetupLessonStructure(lessonStructure);
		SetupNoOtherEntries();

		var request = ValidRequest(lessonStructure.LessonStructureId) with { Notes = null };

		WaitingListEntry? persisted = null;
		_context.Repositories.WaitingListRepositoryMock
			.Setup(r => r.CreateAsync(It.IsAny<WaitingListEntry>(), It.IsAny<CancellationToken>()))
			.Callback<WaitingListEntry, CancellationToken>((entry, _) => persisted = entry)
			.Returns(Task.CompletedTask);

		await _handler.HandleAsync(new CaptureWaitingListStudentCommand(request), TestContext.Current.CancellationToken);

		persisted!.Notes.ShouldBeNull();
	}

	[Fact]
	[Trait("AC", "293UC8")]
	public async Task HandleAsync_ACreatedEntry_ReferencesTheLessonStructureAndCarriesNoCourseReference()
	{
		var lessonStructure = LessonStructureFactory.Create(
			lessonType: LessonType.Group,
			durationType: DurationType.Hour,
			occurrenceType: OccurrenceType.AfterSchool);
		SetupLessonStructure(lessonStructure);
		SetupNoOtherEntries();

		var request = ValidRequest(lessonStructure.LessonStructureId) with { InstrumentType = InstrumentType.Guitar };

		var result = await _handler.HandleAsync(
			new CaptureWaitingListStudentCommand(request),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.LessonType.ShouldBe(LessonType.Group),
			() => result.DurationType.ShouldBe(DurationType.Hour),
			() => result.InstrumentType.ShouldBe(InstrumentType.Guitar));
		// WaitingListEntryResult carries no course or course-type member at all —
		// the type itself is the proof that nothing here can leak one.
	}

	private void SetupLessonStructure(LessonStructure lessonStructure) =>
		_context.Repositories.LessonStructureRepositoryMock
			.Setup(r => r.GetByIdAsync(lessonStructure.LessonStructureId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(lessonStructure);

	/// <summary>The position derivation reads the whole list back, so an empty one always resolves position 1.</summary>
	private void SetupNoOtherEntries() =>
		_context.Repositories.WaitingListRepositoryMock
			.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
			.ReturnsAsync([]);

	private static CaptureWaitingListStudentRequest ValidRequest(Guid lessonStructureId) =>
		new(
			"Amara",
			"Pillay",
			new DateOnly(2016, 2, 14),
			GradeType.Grade4,
			ClassType.A1,
			PhaseType.Junior,
			Language.English,
			lessonStructureId,
			InstrumentType.Piano,
			null);
}
