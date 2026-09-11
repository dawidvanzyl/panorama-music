using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Students.Application.Commands.WaitingList;
using PanoramaMusic.Students.Application.Handlers.WaitingList;
using PanoramaMusic.Students.Application.Requests.WaitingList;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Events.Guardians;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Messages;
using PanoramaMusic.Students.Domain.ValueObjects;
using PanoramaMusic.Students.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Application;

/// <summary>
/// Enrolling a student off the waiting list. The pair that matters is the
/// enrollment and the entry's deletion: they happen together or not at all, so
/// every refusal below asserts that neither half landed.
/// <para>
/// The enrolment names a lesson structure, never a course — the instrument
/// course under that structure is what the student was waiting for, and it is
/// resolved here.
/// </para>
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
		var structure = LessonStructureFactory.Create(occurrenceType: OccurrenceType.DuringSchool);
		var course = GivenInstrumentCourse(structure);
		var teacher = GivenTeacher();
		GivenMissingLinks(entry.Student, []);

		var result = await _handler.HandleAsync(
			EnrolCommand(entry.Student.StudentId, structure.LessonStructureId, teacher.TeacherId),
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
	public async Task HandleAsync_AStructureUnderADifferentOccurrenceType_IsRefusedAndTheEntryRemains()
	{
		var entry = GivenWaitingListEntry(OccurrenceType.DuringSchool);
		var structure = LessonStructureFactory.Create(occurrenceType: OccurrenceType.AfterSchool);
		GivenInstrumentCourse(structure);
		var teacher = GivenTeacher();

		await Should.ThrowAsync<DomainException>(() =>
			_handler.HandleAsync(
				EnrolCommand(entry.Student.StudentId, structure.LessonStructureId, teacher.TeacherId),
				TestContext.Current.CancellationToken));

		VerifyNeitherHalfLanded();
	}

	[Fact]
	[Trait("AC", "295UC3")]
	public async Task HandleAsync_AStructureUnderTheSameOccurrenceTypeButADifferentLessonAndDuration_IsAccepted()
	{
		// Only the occurrence type is fixed at the waiting list. The lesson type
		// and duration type the student waited for are a starting point the
		// Coordinator may move away from, so a structure that differs on those two
		// alone must still be enrollable.
		var entry = GivenWaitingListEntry(
			OccurrenceType.DuringSchool,
			LessonStructureFactory.Create(
				lessonType: LessonType.Individual,
				durationType: DurationType.Hour,
				occurrenceType: OccurrenceType.DuringSchool));
		var structure = LessonStructureFactory.Create(
			lessonType: LessonType.Group,
			durationType: DurationType.HalfHour,
			occurrenceType: OccurrenceType.DuringSchool);
		GivenInstrumentCourse(structure);
		var teacher = GivenTeacher();
		GivenMissingLinks(entry.Student, []);

		var result = await _handler.HandleAsync(
			EnrolCommand(entry.Student.StudentId, structure.LessonStructureId, teacher.TeacherId),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.LessonType.ShouldBe(LessonType.Group),
			() => result.DurationType.ShouldBe(DurationType.HalfHour),
			() => result.OccurrenceType.ShouldBe(OccurrenceType.DuringSchool),
			() => _context.Repositories.WaitingListRepositoryMock.Verify(
				r => r.DeleteAsync(entry, It.IsAny<CancellationToken>()), Times.Once));
	}

	[Fact]
	[Trait("AC", "295UC20")]
	public async Task HandleAsync_AStructureWithNoInstrumentCourse_IsRefusedAndTheEntryRemains()
	{
		// The dead end this path must never present: the school offers nothing to
		// enrol into under the structure chosen, and the Coordinator is told so
		// rather than left with a submission that cannot land.
		var entry = GivenWaitingListEntry(OccurrenceType.DuringSchool);
		var structure = GivenLessonStructure(
			LessonStructureFactory.Create(occurrenceType: OccurrenceType.DuringSchool));
		_context.Repositories.CourseRepositoryMock
			.Setup(r => r.GetByTypeAndStructureAsync(
				CourseType.Instrument, structure.LessonStructureId, It.IsAny<CancellationToken>()))
			.ReturnsAsync((Course?)null);
		var teacher = GivenTeacher();

		var exception = await Should.ThrowAsync<DomainException>(() =>
			_handler.HandleAsync(
				EnrolCommand(entry.Student.StudentId, structure.LessonStructureId, teacher.TeacherId),
				TestContext.Current.CancellationToken));

		// Two refusals on this path throw the same type, so the message is what
		// tells the Coordinator which dead end they hit.
		exception.Message.ShouldBe(WaitingListMessages.NoInstrumentCourseForStructure);
		VerifyNeitherHalfLanded();
	}

	[Fact]
	[Trait("AC", "295UC4")]
	public async Task HandleAsync_AShapeTheCourseTypeRefuses_CreatesNothingAndLeavesTheEntry()
	{
		// An instrument course records a step, and this request carries none —
		// the refusal comes from the domain rather than from the waiting list,
		// which is exactly the case that must not delete the entry on its way out.
		var entry = GivenWaitingListEntry(OccurrenceType.DuringSchool);
		var structure = LessonStructureFactory.Create(occurrenceType: OccurrenceType.DuringSchool);
		GivenInstrumentCourse(structure);
		var teacher = GivenTeacher();

		await Should.ThrowAsync<DomainException>(() =>
			_handler.HandleAsync(
				EnrolCommand(entry.Student.StudentId, structure.LessonStructureId, teacher.TeacherId, stepType: null),
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

	[Fact]
	[Trait("AC", "306UC1")]
	public async Task HandleAsync_AnEnrolledSiblingMissingTheStudentsGuardian_CreatesThatLink()
	{
		var entry = GivenWaitingListEntry(OccurrenceType.DuringSchool);
		var structure = LessonStructureFactory.Create(occurrenceType: OccurrenceType.DuringSchool);
		GivenInstrumentCourse(structure);
		var teacher = GivenTeacher();
		var sibling = StudentFactory.Create();
		var guardian = GuardianFactory.Create();
		GivenMissingLinks(entry.Student, [(sibling, guardian)]);

		await _handler.HandleAsync(
			EnrolCommand(entry.Student.StudentId, structure.LessonStructureId, teacher.TeacherId),
			TestContext.Current.CancellationToken);

		_context.Repositories.StudentGuardianRepositoryMock.Verify(
			r => r.CreateAsync(
				It.Is<StudentGuardian>(link =>
					link.StudentId == sibling.StudentId && link.GuardianId == guardian.GuardianId),
				It.IsAny<CancellationToken>()),
			Times.Once);
	}

	[Fact]
	[Trait("AC", "306UC4")]
	public async Task HandleAsync_AStudentWhoseFamilyIsMissingNothing_EnrolsAndCreatesNoLink()
	{
		// A student with no siblings, and equally one whose siblings are all still
		// waiting: the family is missing nothing either way, and enrolling must
		// succeed without writing a guardian link.
		var entry = GivenWaitingListEntry(OccurrenceType.DuringSchool);
		var structure = LessonStructureFactory.Create(occurrenceType: OccurrenceType.DuringSchool);
		GivenInstrumentCourse(structure);
		var teacher = GivenTeacher();
		GivenMissingLinks(entry.Student, []);

		var result = await _handler.HandleAsync(
			EnrolCommand(entry.Student.StudentId, structure.LessonStructureId, teacher.TeacherId),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.StudentId.ShouldBe(entry.Student.StudentId),
			() => VerifyNoLinkWasCreated());
	}

	[Fact]
	[Trait("AC", "306UC5")]
	public async Task HandleAsync_AReconciliationThatFailsPartWayThrough_FailsTheWholeEnrolment()
	{
		// The links are computed, the first one lands, and the second throws. Every
		// write on this path shares the request's transaction, so the enrolment must
		// be allowed to fail with it rather than being reported as a success that
		// left the family half-reconciled.
		var entry = GivenWaitingListEntry(OccurrenceType.DuringSchool);
		var structure = LessonStructureFactory.Create(occurrenceType: OccurrenceType.DuringSchool);
		GivenInstrumentCourse(structure);
		var teacher = GivenTeacher();
		var first = StudentFactory.Create();
		var second = StudentFactory.Create();
		var guardian = GuardianFactory.Create();
		GivenMissingLinks(entry.Student, [(first, guardian), (second, guardian)]);
		_context.Repositories.StudentGuardianRepositoryMock
			.Setup(r => r.CreateAsync(
				It.Is<StudentGuardian>(link => link.StudentId == second.StudentId),
				It.IsAny<CancellationToken>()))
			.ThrowsAsync(new InvalidOperationException("The link could not be written."));

		await Should.ThrowAsync<InvalidOperationException>(() =>
			_handler.HandleAsync(
				EnrolCommand(entry.Student.StudentId, structure.LessonStructureId, teacher.TeacherId),
				TestContext.Current.CancellationToken));

		// The first link was written before the failure, so it is inside the same
		// doomed transaction as the enrollment and the entry's deletion.
		_context.Repositories.StudentGuardianRepositoryMock.Verify(
			r => r.CreateAsync(
				It.Is<StudentGuardian>(link => link.StudentId == first.StudentId),
				It.IsAny<CancellationToken>()),
			Times.Once);
	}

	[Fact]
	[Trait("AC", "306UC6")]
	public async Task HandleAsync_ALinkCreatedByTheReconciliation_CarriesTheWaitingListWriteSource()
	{
		// What separates a reconciliation from a guardian someone linked by hand on
		// an enrolled student's own record, which is a roster write.
		var entry = GivenWaitingListEntry(OccurrenceType.DuringSchool);
		var structure = LessonStructureFactory.Create(occurrenceType: OccurrenceType.DuringSchool);
		GivenInstrumentCourse(structure);
		var teacher = GivenTeacher();
		var sibling = StudentFactory.Create();
		var guardian = GuardianFactory.Create();
		GivenMissingLinks(entry.Student, [(sibling, guardian)]);
		var links = CaptureCreatedLinks();

		await _handler.HandleAsync(
			EnrolCommand(entry.Student.StudentId, structure.LessonStructureId, teacher.TeacherId),
			TestContext.Current.CancellationToken);

		var linked = links.ShouldHaveSingleItem().DrainEvents().ShouldHaveSingleItem().ShouldBeOfType<GuardianLinked>();
		ShouldlyHelpers.Satisfy(
			() => linked.Source.ShouldBe(StudentPopulation.WaitingList),
			() => linked.Student.StudentId.ShouldBe(sibling.StudentId),
			() => linked.Guardian.GuardianId.ShouldBe(guardian.GuardianId));
	}

	[Fact]
	[Trait("AC", "306UC7")]
	public async Task HandleAsync_AReconciliationThatCreatesLinks_ChangesNoGuardiansOwnDetails()
	{
		// A guardian is one row shared across the family, so rewriting one here
		// would reach every student holding it. Only the links are this story's.
		var entry = GivenWaitingListEntry(OccurrenceType.DuringSchool);
		var structure = LessonStructureFactory.Create(occurrenceType: OccurrenceType.DuringSchool);
		GivenInstrumentCourse(structure);
		var teacher = GivenTeacher();
		var sibling = StudentFactory.Create();
		var guardian = GuardianFactory.Create();
		GivenMissingLinks(entry.Student, [(sibling, guardian)]);

		await _handler.HandleAsync(
			EnrolCommand(entry.Student.StudentId, structure.LessonStructureId, teacher.TeacherId),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => _context.Repositories.GuardianRepositoryMock.Verify(
				r => r.UpdateAsync(It.IsAny<Guardian>(), It.IsAny<CancellationToken>()), Times.Never),
			() => _context.Repositories.GuardianRepositoryMock.Verify(
				r => r.DeleteAsync(It.IsAny<Guardian>(), It.IsAny<CancellationToken>()), Times.Never),
			() => _context.Repositories.GuardianRepositoryMock.Verify(
				r => r.CreateAsync(It.IsAny<Guardian>(), It.IsAny<CancellationToken>()), Times.Never),
			() => _context.Repositories.StudentGuardianRepositoryMock.Verify(
				r => r.DeleteAsync(It.IsAny<StudentGuardian>(), It.IsAny<CancellationToken>()), Times.Never));
	}

	/// <summary>
	/// The family state the database resolves: which of this student's enrolled
	/// siblings lack which of their guardians, and the records those ids name.
	/// </summary>
	private void GivenMissingLinks(Student student, (Student Sibling, Guardian Guardian)[] missing)
	{
		_context.Repositories.StudentGuardianRepositoryMock
			.Setup(r => r.GetMissingEnrolledSiblingLinksAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([.. missing.Select(link => new MissingGuardianLink(link.Sibling.StudentId, link.Guardian.GuardianId))]);
		_context.Repositories.SiblingRepositoryMock
			.Setup(r => r.GetSiblingsAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([.. missing.Select(link => link.Sibling).Distinct()]);
		_context.Repositories.StudentGuardianRepositoryMock
			.Setup(r => r.GetGuardiansByStudentIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([.. missing.Select(link => link.Guardian).Distinct()]);
	}

	private List<StudentGuardian> CaptureCreatedLinks()
	{
		var links = new List<StudentGuardian>();

		_context.Repositories.StudentGuardianRepositoryMock
			.Setup(r => r.CreateAsync(It.IsAny<StudentGuardian>(), It.IsAny<CancellationToken>()))
			.Callback<StudentGuardian, CancellationToken>((link, _) => links.Add(link));

		return links;
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

	private LessonStructure GivenLessonStructure(LessonStructure lessonStructure)
	{
		_context.Repositories.LessonStructureRepositoryMock
			.Setup(r => r.GetByIdAsync(lessonStructure.LessonStructureId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(lessonStructure);

		return lessonStructure;
	}

	/// <summary>
	/// The structure the request names, and the one instrument course the school
	/// offers under it — the pair the handler resolves an enrolment from.
	/// </summary>
	private Course GivenInstrumentCourse(LessonStructure lessonStructure)
	{
		GivenLessonStructure(lessonStructure);

		var course = CourseFactory.Create(courseType: CourseType.Instrument, lessonStructure: lessonStructure);
		_context.Repositories.CourseRepositoryMock
			.Setup(r => r.GetByTypeAndStructureAsync(
				CourseType.Instrument, lessonStructure.LessonStructureId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(course);

		return course;
	}

	private DirectoryTeacher GivenTeacher()
	{
		var teacher = DirectoryTeacherFactory.Create();

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
				r => r.DeleteAsync(It.IsAny<WaitingListEntry>(), It.IsAny<CancellationToken>()), Times.Never),
			// A student who does not end up enrolled leaves their siblings' guardians
			// exactly as they were — the family is reconciled by an enrolment, and a
			// refused one is not an enrolment.
			VerifyNoLinkWasCreated);

	private void VerifyNoLinkWasCreated() =>
		_context.Repositories.StudentGuardianRepositoryMock.Verify(
			r => r.CreateAsync(It.IsAny<StudentGuardian>(), It.IsAny<CancellationToken>()), Times.Never);

	private static EnrolWaitingListStudentCommand EnrolCommand(
		Guid studentId,
		Guid lessonStructureId,
		Guid teacherId,
		InstrumentType? instrumentType = InstrumentType.Piano,
		StepType? stepType = StepType.Step2A) =>
		new(studentId, new EnrolWaitingListStudentRequest(lessonStructureId, teacherId, instrumentType, stepType, _enrolledDate));
}