using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Students.Application.Commands.WaitingList;
using PanoramaMusic.Students.Application.Handlers.WaitingList;
using PanoramaMusic.Students.Application.Requests.StudentCourses;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.ValueObjects;
using PanoramaMusic.Students.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Application;

/// <summary>
/// Enrolling a student off the waiting list. The pair that matters is the
/// enrollment and the entry's deletion: they happen together or not at all, so
/// every refusal below asserts that neither half landed.
/// </summary>
public class EnrolWaitingListStudentHandlerTests : IClassFixture<StudentsTestFixture>
{
	private static readonly DateOnly _enrolledDate = new(2026, 9, 9);

	private readonly StudentsTestContext _context;
	private readonly EnrolWaitingListStudentHandler _handler;

	public EnrolWaitingListStudentHandlerTests(StudentsTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<EnrolWaitingListStudentHandler>();
	}

	[Fact]
	[Trait("AC", "295UC1")]
	public async Task HandleAsync_AStudentHoldingAnEntry_CreatesTheEnrollmentAndDeletesTheEntry()
	{
		var entry = GivenWaitingListEntry(OccurrenceType.DuringSchool);
		var course = CourseFactory.Create(
			courseType: CourseType.G2Recorder,
			lessonStructure: LessonStructureFactory.Create(occurrenceType: OccurrenceType.DuringSchool));
		var teacher = GivenCourseAndTeacher(entry, course);

		var result = await _handler.HandleAsync(
			EnrolCommand(entry.Student.StudentId, course.CourseId, teacher.TeacherId),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.StudentId.ShouldBe(entry.Student.StudentId),
			() => result.CourseId.ShouldBe(course.CourseId),
			() => result.TeacherId.ShouldBe(teacher.TeacherId),
			() => result.EnrolledDate.ShouldBe(_enrolledDate),
			() => _context.Repositories.StudentCourseRepositoryMock.Verify(
				r => r.CreateAsync(
					It.Is<StudentCourse>(e => e.StudentId == entry.Student.StudentId && e.Course.CourseId == course.CourseId),
					It.IsAny<CancellationToken>()),
				Times.Once),
			() => _context.Repositories.WaitingListRepositoryMock.Verify(
				r => r.DeleteAsync(entry, It.IsAny<CancellationToken>()), Times.Once));
	}

	[Fact]
	[Trait("AC", "295UC2")]
	public async Task HandleAsync_ACourseUnderADifferentOccurrenceType_IsRefusedAndTheEntryRemains()
	{
		var entry = GivenWaitingListEntry(OccurrenceType.DuringSchool);
		var course = CourseFactory.Create(
			courseType: CourseType.G2Recorder,
			lessonStructure: LessonStructureFactory.Create(occurrenceType: OccurrenceType.AfterSchool));
		var teacher = GivenCourseAndTeacher(entry, course);

		await Should.ThrowAsync<DomainException>(() =>
			_handler.HandleAsync(
				EnrolCommand(entry.Student.StudentId, course.CourseId, teacher.TeacherId),
				TestContext.Current.CancellationToken));

		VerifyNeitherHalfLanded();
	}

	[Fact]
	[Trait("AC", "295UC3")]
	public async Task HandleAsync_ACourseUnderTheSameOccurrenceTypeButADifferentStructure_IsAccepted()
	{
		// Only the occurrence type is fixed at the waiting list. The lesson type
		// and duration type the student waited for are a starting point the
		// Coordinator may move away from, so a course that differs on those two
		// alone must still be enrollable.
		var entry = GivenWaitingListEntry(
			OccurrenceType.DuringSchool,
			LessonStructureFactory.Create(
				lessonType: LessonType.Individual,
				durationType: DurationType.Hour,
				occurrenceType: OccurrenceType.DuringSchool));
		var course = CourseFactory.Create(
			courseType: CourseType.G2Recorder,
			lessonStructure: LessonStructureFactory.Create(
				lessonType: LessonType.Group,
				durationType: DurationType.HalfHour,
				occurrenceType: OccurrenceType.DuringSchool));
		var teacher = GivenCourseAndTeacher(entry, course);

		var result = await _handler.HandleAsync(
			EnrolCommand(entry.Student.StudentId, course.CourseId, teacher.TeacherId),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.LessonType.ShouldBe(LessonType.Group),
			() => result.DurationType.ShouldBe(DurationType.HalfHour),
			() => result.OccurrenceType.ShouldBe(OccurrenceType.DuringSchool),
			() => _context.Repositories.WaitingListRepositoryMock.Verify(
				r => r.DeleteAsync(entry, It.IsAny<CancellationToken>()), Times.Once));
	}

	[Fact]
	[Trait("AC", "295UC4")]
	public async Task HandleAsync_AShapeTheChosenCourseTypeRefuses_CreatesNothingAndLeavesTheEntry()
	{
		// An instrument course records a step, and this request carries none —
		// the refusal comes from the domain rather than from the waiting list,
		// which is exactly the case that must not delete the entry on its way out.
		var entry = GivenWaitingListEntry(OccurrenceType.DuringSchool);
		var course = CourseFactory.Create(
			courseType: CourseType.Instrument,
			lessonStructure: LessonStructureFactory.Create(occurrenceType: OccurrenceType.DuringSchool));
		var teacher = GivenCourseAndTeacher(entry, course);

		await Should.ThrowAsync<DomainException>(() =>
			_handler.HandleAsync(
				EnrolCommand(entry.Student.StudentId, course.CourseId, teacher.TeacherId, InstrumentType.Piano),
				TestContext.Current.CancellationToken));

		VerifyNeitherHalfLanded();
	}

	[Fact]
	[Trait("AC", "295UC8")]
	public async Task HandleAsync_AStudentHoldingNoWaitingListEntry_IsRefusedAndNothingIsCreated()
	{
		var studentId = Guid.NewGuid();
		_context.Repositories.WaitingListRepositoryMock
			.Setup(r => r.GetByStudentIdAsync(studentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync((WaitingListEntry?)null);

		await Should.ThrowAsync<EntityNotFoundException>(() =>
			_handler.HandleAsync(
				EnrolCommand(studentId, Guid.NewGuid(), Guid.NewGuid()),
				TestContext.Current.CancellationToken));

		VerifyNeitherHalfLanded();
	}

	private WaitingListEntry GivenWaitingListEntry(OccurrenceType occurrenceType, LessonStructure? lessonStructure = null)
	{
		var entry = WaitingListEntryFactory.Create(
			lessonStructure: lessonStructure ?? LessonStructureFactory.Create(occurrenceType: occurrenceType));

		_context.Repositories.WaitingListRepositoryMock
			.Setup(r => r.GetByStudentIdAsync(entry.Student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(entry);

		return entry;
	}

	private DirectoryTeacher GivenCourseAndTeacher(WaitingListEntry entry, Course course)
	{
		var teacher = DirectoryTeacherFactory.Create();

		_context.Repositories.CourseRepositoryMock
			.Setup(r => r.GetByIdAsync(course.CourseId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(course);
		_context.Repositories.TeacherDirectoryMock
			.Setup(d => d.GetTeacherAsync(teacher.TeacherId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(teacher);

		return teacher;
	}

	private void VerifyNeitherHalfLanded() =>
		ShouldlyHelpers.Satisfy(
			() => _context.Repositories.StudentCourseRepositoryMock.Verify(
				r => r.CreateAsync(It.IsAny<StudentCourse>(), It.IsAny<CancellationToken>()), Times.Never),
			() => _context.Repositories.WaitingListRepositoryMock.Verify(
				r => r.DeleteAsync(It.IsAny<WaitingListEntry>(), It.IsAny<CancellationToken>()), Times.Never));

	private static EnrolWaitingListStudentCommand EnrolCommand(
		Guid studentId,
		Guid courseId,
		Guid teacherId,
		InstrumentType? instrumentType = null,
		StepType? stepType = null) =>
		new(studentId, new EnrollStudentRequest(courseId, teacherId, instrumentType, stepType, _enrolledDate));
}
