using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Students.Application.Commands.StudentCourses;
using PanoramaMusic.Students.Application.Handlers.StudentCourses;
using PanoramaMusic.Students.Application.Requests.StudentCourses;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Events.StudentCourses;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.ValueObjects;
using PanoramaMusic.Students.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Application;

public class EnrollStudentHandlerTests : IClassFixture<StudentsTestFixture>
{
	private static readonly DateOnly _enrolledDate = new(2026, 8, 16);

	private readonly StudentsTestContext _context;
	private readonly EnrollStudentHandler _handler;

	public EnrollStudentHandlerTests(StudentsTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<EnrollStudentHandler>();
	}

	[Fact]
	[Trait("AC", "268UC1")]
	public async Task HandleAsync_StudentCourseAndTeacher_PersistsTheEnrollmentWithOneTeacherAndTheSuppliedDate()
	{
		var student = StudentFactory.Create();
		var course = CourseFactory.Create(courseType: CourseType.G2Recorder);
		var teacher = GivenStudentCourseAndTeacher(student, course);

		var result = await _handler.HandleAsync(
			EnrollCommand(student.StudentId, course.CourseId, teacher.TeacherId),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.StudentCourseId.ShouldNotBe(Guid.Empty),
			() => result.StudentId.ShouldBe(student.StudentId),
			() => result.CourseId.ShouldBe(course.CourseId),
			() => result.TeacherId.ShouldBe(teacher.TeacherId),
			() => result.TeacherFirstName.ShouldBe(teacher.FirstName),
			() => result.TeacherSurname.ShouldBe(teacher.Surname),
			() => result.EnrolledDate.ShouldBe(_enrolledDate),
			() => _context.Repositories.StudentCourseRepositoryMock.Verify(
				r => r.CreateAsync(
					It.Is<StudentCourse>(e => e.StudentId == student.StudentId
						&& e.Course.CourseId == course.CourseId
						&& e.TeacherId == teacher.TeacherId
						&& e.EnrolledDate == _enrolledDate),
					It.IsAny<CancellationToken>()),
				Times.Once));
	}

	[Fact]
	[Trait("AC", "268UC2")]
	public async Task HandleAsync_StudentAlreadyEnrolledInAnotherCourse_EnrollsThemInTheSecondCourseAsWell()
	{
		var student = StudentFactory.Create();
		var theory = CourseFactory.Create(courseType: CourseType.Theory);
		var recorder = CourseFactory.Create(courseType: CourseType.G2Recorder);
		var teacher = GivenStudentCourseAndTeacher(student, recorder);
		GivenExistingEnrollments(
			student.StudentId,
			StudentCourseFactory.Create(studentId: student.StudentId, course: theory));

		var result = await _handler.HandleAsync(
			EnrollCommand(student.StudentId, recorder.CourseId, teacher.TeacherId),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.CourseId.ShouldBe(recorder.CourseId),
			// The enrollment the student already held is untouched — nothing about
			// this one replaces it.
			() => _context.Repositories.StudentCourseRepositoryMock.Verify(
				r => r.CreateAsync(
					It.Is<StudentCourse>(e => e.Course.CourseId == recorder.CourseId),
					It.IsAny<CancellationToken>()),
				Times.Once));
	}

	[Fact]
	[Trait("AC", "268UC3")]
	public async Task HandleAsync_StudentAlreadyEnrolledInTheSameCourse_ThrowsDomainExceptionAndPersistsNothing()
	{
		var student = StudentFactory.Create();
		var course = CourseFactory.Create(courseType: CourseType.G2Recorder);
		var teacher = GivenStudentCourseAndTeacher(student, course);
		GivenExistingEnrollments(
			student.StudentId,
			StudentCourseFactory.Create(studentId: student.StudentId, course: course));

		await Should.ThrowAsync<DomainException>(() => _handler.HandleAsync(
			EnrollCommand(student.StudentId, course.CourseId, teacher.TeacherId),
			TestContext.Current.CancellationToken));

		VerifyNothingPersisted();
	}

	[Fact]
	[Trait("AC", "268UC4")]
	public async Task HandleAsync_InstrumentCourseWithInstrumentTypeAndStep_RecordsBothAgainstThatEnrollmentAlone()
	{
		var student = StudentFactory.Create();
		var instrumentCourse = CourseFactory.Create(courseType: CourseType.Instrument);
		var theoryCourse = CourseFactory.Create(courseType: CourseType.Theory);
		var teacher = GivenStudentCourseAndTeacher(student, instrumentCourse);
		var existing = StudentCourseFactory.Create(
			studentId: student.StudentId,
			course: theoryCourse,
			instrument: new StudentInstrument(InstrumentType: null, StepType.Step4B));
		GivenExistingEnrollments(student.StudentId, existing);

		var result = await _handler.HandleAsync(
			EnrollCommand(
				student.StudentId,
				instrumentCourse.CourseId,
				teacher.TeacherId,
				InstrumentType.Piano,
				StepType.Step2A),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.InstrumentType.ShouldBe(InstrumentType.Piano),
			() => result.StepType.ShouldBe(StepType.Step2A),
			// The student's other enrollment keeps the step it was recorded with —
			// instrument and step belong to one enrollment, not to the student.
			() => existing.Instrument!.StepType.ShouldBe(StepType.Step4B),
			() => existing.Instrument!.InstrumentType.ShouldBeNull(),
			// The instrument and step are their own record, written against the
			// enrollment just created.
			() => _context.Repositories.StudentCourseRepositoryMock.Verify(
				r => r.CreateInstrumentAsync(
					It.IsAny<Guid>(),
					It.Is<StudentInstrument>(i => i.InstrumentType == InstrumentType.Piano && i.StepType == StepType.Step2A),
					It.IsAny<CancellationToken>()),
				Times.Once));
	}

	[Theory]
	[InlineData(null, StepType.Step2A)]
	[InlineData(InstrumentType.Guitar, null)]
	[Trait("AC", "268UC5")]
	public async Task HandleAsync_InstrumentCourseMissingItsInstrumentTypeOrStep_ThrowsDomainExceptionAndPersistsNothing(
		InstrumentType? instrumentType,
		StepType? stepType)
	{
		var student = StudentFactory.Create();
		var course = CourseFactory.Create(courseType: CourseType.Instrument);
		var teacher = GivenStudentCourseAndTeacher(student, course);

		await Should.ThrowAsync<DomainException>(() => _handler.HandleAsync(
			EnrollCommand(student.StudentId, course.CourseId, teacher.TeacherId, instrumentType, stepType),
			TestContext.Current.CancellationToken));

		VerifyNothingPersisted();
	}

	[Fact]
	[Trait("AC", "268UC6")]
	public async Task HandleAsync_TheoryCourseWithAStepAndNoInstrumentType_RecordsTheStepAndNoInstrumentType()
	{
		var student = StudentFactory.Create();
		var course = CourseFactory.Create(courseType: CourseType.Theory);
		var teacher = GivenStudentCourseAndTeacher(student, course);

		var result = await _handler.HandleAsync(
			EnrollCommand(student.StudentId, course.CourseId, teacher.TeacherId, instrumentType: null, StepType.Step2B),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.StepType.ShouldBe(StepType.Step2B),
			() => result.InstrumentType.ShouldBeNull());
	}

	[Theory]
	[InlineData(null, null)]
	[InlineData(InstrumentType.Voice, StepType.Step1A)]
	[Trait("AC", "268UC7")]
	public async Task HandleAsync_TheoryCourseMissingItsStepOrCarryingAnInstrumentType_ThrowsDomainExceptionAndPersistsNothing(
		InstrumentType? instrumentType,
		StepType? stepType)
	{
		var student = StudentFactory.Create();
		var course = CourseFactory.Create(courseType: CourseType.Theory);
		var teacher = GivenStudentCourseAndTeacher(student, course);

		await Should.ThrowAsync<DomainException>(() => _handler.HandleAsync(
			EnrollCommand(student.StudentId, course.CourseId, teacher.TeacherId, instrumentType, stepType),
			TestContext.Current.CancellationToken));

		VerifyNothingPersisted();
	}

	[Fact]
	[Trait("AC", "268UC8")]
	public async Task HandleAsync_CourseTypeThatRecordsNeither_IsAcceptedWithoutThemAndRefusedWithEither()
	{
		var student = StudentFactory.Create();
		var course = CourseFactory.Create(courseType: CourseType.GREEnrichment);
		var teacher = GivenStudentCourseAndTeacher(student, course);

		var result = await _handler.HandleAsync(
			EnrollCommand(student.StudentId, course.CourseId, teacher.TeacherId),
			TestContext.Current.CancellationToken);

		var withInstrument = await Should.ThrowAsync<DomainException>(() => _handler.HandleAsync(
			EnrollCommand(student.StudentId, course.CourseId, teacher.TeacherId, InstrumentType.Recorder, stepType: null),
			TestContext.Current.CancellationToken));
		var withStep = await Should.ThrowAsync<DomainException>(() => _handler.HandleAsync(
			EnrollCommand(student.StudentId, course.CourseId, teacher.TeacherId, instrumentType: null, StepType.Step1B),
			TestContext.Current.CancellationToken));

		ShouldlyHelpers.Satisfy(
			() => result.InstrumentType.ShouldBeNull(),
			() => result.StepType.ShouldBeNull(),
			() => withInstrument.ShouldNotBeNull(),
			() => withStep.ShouldNotBeNull());
	}

	[Fact]
	[Trait("AC", "268UC9")]
	public async Task HandleAsync_UnknownStudentCourseOrTeacher_IsRejectedAndPersistsNothing()
	{
		var student = StudentFactory.Create();
		var course = CourseFactory.Create(courseType: CourseType.G2Recorder);
		var teacher = GivenStudentCourseAndTeacher(student, course);

		var unknownStudent = await Should.ThrowAsync<EntityNotFoundException>(() => _handler.HandleAsync(
			EnrollCommand(Guid.NewGuid(), course.CourseId, teacher.TeacherId),
			TestContext.Current.CancellationToken));
		var unknownCourse = await Should.ThrowAsync<EntityNotFoundException>(() => _handler.HandleAsync(
			EnrollCommand(student.StudentId, Guid.NewGuid(), teacher.TeacherId),
			TestContext.Current.CancellationToken));
		var unknownTeacher = await Should.ThrowAsync<EntityNotFoundException>(() => _handler.HandleAsync(
			EnrollCommand(student.StudentId, course.CourseId, Guid.NewGuid()),
			TestContext.Current.CancellationToken));

		ShouldlyHelpers.Satisfy(
			() => unknownStudent.ShouldNotBeNull(),
			() => unknownCourse.ShouldNotBeNull(),
			() => unknownTeacher.ShouldNotBeNull(),
			() => VerifyNothingPersisted());
	}

	[Fact]
	[Trait("AC", "268UC12")]
	public async Task HandleAsync_SuccessfulEnrollment_RaisesTheStudentEnrolledAuditEventOnTheAggregate()
	{
		var student = StudentFactory.Create();
		var course = CourseFactory.Create(courseType: CourseType.G2Recorder);
		var teacher = GivenStudentCourseAndTeacher(student, course);

		StudentCourse? persisted = null;
		_context.Repositories.StudentCourseRepositoryMock
			.Setup(r => r.CreateAsync(It.IsAny<StudentCourse>(), It.IsAny<CancellationToken>()))
			.Callback<StudentCourse, CancellationToken>((enrollment, _) => persisted = enrollment)
			.Returns(Task.CompletedTask);

		await _handler.HandleAsync(
			EnrollCommand(student.StudentId, course.CourseId, teacher.TeacherId),
			TestContext.Current.CancellationToken);

		var raised = persisted.ShouldNotBeNull().DrainEvents().OfType<StudentEnrolled>().ShouldHaveSingleItem();

		ShouldlyHelpers.Satisfy(
			() => raised.Student.StudentId.ShouldBe(student.StudentId),
			() => raised.Enrollment.Course.CourseId.ShouldBe(course.CourseId),
			() => raised.Teacher.TeacherId.ShouldBe(teacher.TeacherId));
	}

	/// <summary>
	/// Wires the three reads a successful enrollment makes, leaving the student
	/// holding no enrollments yet, and returns the teacher the directory answers
	/// with.
	/// </summary>
	private DirectoryTeacher GivenStudentCourseAndTeacher(Student student, Course course)
	{
		var teacher = DirectoryTeacherFactory.Create();

		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(student);
		_context.Repositories.CourseRepositoryMock
			.Setup(r => r.GetByIdAsync(course.CourseId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(course);
		_context.Repositories.TeacherDirectoryMock
			.Setup(d => d.GetTeacherAsync(teacher.TeacherId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(teacher);
		GivenExistingEnrollments(student.StudentId);

		return teacher;
	}

	private void GivenExistingEnrollments(Guid studentId, params StudentCourse[] enrollments)
	{
		var enrolledCourseIds = enrollments.Select(enrollment => enrollment.Course.CourseId).ToHashSet();

		_context.Repositories.StudentCourseRepositoryMock
			.Setup(r => r.ExistsByStudentAndCourseAsync(studentId, It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync((Guid _, Guid courseId, CancellationToken _) => enrolledCourseIds.Contains(courseId));
	}

	private void VerifyNothingPersisted() =>
		_context.Repositories.StudentCourseRepositoryMock.Verify(
			r => r.CreateAsync(It.IsAny<StudentCourse>(), It.IsAny<CancellationToken>()),
			Times.Never);

	private static EnrollStudentCommand EnrollCommand(
		Guid studentId,
		Guid courseId,
		Guid teacherId,
		InstrumentType? instrumentType = null,
		StepType? stepType = null) =>
		new(studentId, new EnrollStudentRequest(courseId, teacherId, instrumentType, stepType, _enrolledDate));
}