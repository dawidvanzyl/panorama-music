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

public class UpdateEnrollmentHandlerTests : IClassFixture<StudentsTestFixture>
{
	private readonly StudentsTestContext _context;
	private readonly UpdateEnrollmentHandler _handler;

	public UpdateEnrollmentHandlerTests(StudentsTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<UpdateEnrollmentHandler>();
	}

	[Fact]
	[Trait("AC", "269UC1")]
	public async Task HandleAsync_NewTeacherInstrumentTypeAndStep_PersistsTheEnrollmentWithTheNewValues()
	{
		var student = StudentFactory.Create();
		var course = CourseFactory.Create(courseType: CourseType.Instrument);
		var enrollment = StudentCourseFactory.Create(
			studentId: student.StudentId,
			course: course,
			instrument: new StudentInstrument(InstrumentType.Piano, StepType.Step2A));
		var teacher = GivenEnrollmentStudentAndTeacher(student, enrollment);

		var result = await _handler.HandleAsync(
			UpdateCommand(student.StudentId, enrollment.StudentCourseId, teacher.TeacherId, InstrumentType.Guitar, StepType.Step3B),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.TeacherId.ShouldBe(teacher.TeacherId),
			() => result.InstrumentType.ShouldBe(InstrumentType.Guitar),
			() => result.StepType.ShouldBe(StepType.Step3B),
			// The course and the enrolled date are settled at enrollment, so
			// neither moved with the correction.
			() => result.CourseId.ShouldBe(course.CourseId),
			() => result.EnrolledDate.ShouldBe(enrollment.EnrolledDate),
			() => _context.Repositories.StudentCourseRepositoryMock.Verify(
				r => r.UpdateAsync(
					It.Is<StudentCourse>(e => e.TeacherId == teacher.TeacherId
						&& e.Instrument!.InstrumentType == InstrumentType.Guitar
						&& e.Instrument!.StepType == StepType.Step3B),
					It.IsAny<CancellationToken>()),
				Times.Once),
			// What the enrollment records is replaced outright, so the old row goes
			// before the corrected one is written.
			() => _context.Repositories.StudentCourseRepositoryMock.Verify(
				r => r.DeleteInstrumentAsync(enrollment.StudentCourseId, It.IsAny<CancellationToken>()),
				Times.Once),
			() => _context.Repositories.StudentCourseRepositoryMock.Verify(
				r => r.CreateInstrumentAsync(
					enrollment.StudentCourseId,
					It.Is<StudentInstrument>(i => i.InstrumentType == InstrumentType.Guitar && i.StepType == StepType.Step3B),
					It.IsAny<CancellationToken>()),
				Times.Once));
	}

	[Fact]
	[Trait("AC", "269UC1")]
	public async Task HandleAsync_CourseTypeRecordingNeither_ReplacesNothingAndWritesNoInstrument()
	{
		var student = StudentFactory.Create();
		var enrollment = StudentCourseFactory.Create(
			studentId: student.StudentId,
			course: CourseFactory.Create(courseType: CourseType.GREEnrichment));
		var teacher = GivenEnrollmentStudentAndTeacher(student, enrollment);

		await _handler.HandleAsync(
			UpdateCommand(student.StudentId, enrollment.StudentCourseId, teacher.TeacherId),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			// The row is still dropped — the course type may have recorded
			// something before — but nothing takes its place.
			() => _context.Repositories.StudentCourseRepositoryMock.Verify(
				r => r.DeleteInstrumentAsync(enrollment.StudentCourseId, It.IsAny<CancellationToken>()),
				Times.Once),
			() => _context.Repositories.StudentCourseRepositoryMock.Verify(
				r => r.CreateInstrumentAsync(It.IsAny<Guid>(), It.IsAny<StudentInstrument>(), It.IsAny<CancellationToken>()),
				Times.Never));
	}

	[Theory]
	[InlineData(null, StepType.Step2A)]
	[InlineData(InstrumentType.Guitar, null)]
	[Trait("AC", "269UC2")]
	public async Task HandleAsync_InstrumentCourseMissingItsInstrumentTypeOrStep_IsRejectedAndLeavesTheEnrollmentUnchanged(
		InstrumentType? instrumentType,
		StepType? stepType)
	{
		var student = StudentFactory.Create();
		var enrollment = StudentCourseFactory.Create(
			studentId: student.StudentId,
			course: CourseFactory.Create(courseType: CourseType.Instrument),
			instrument: new StudentInstrument(InstrumentType.Piano, StepType.Step2A));
		var teacher = GivenEnrollmentStudentAndTeacher(student, enrollment);

		await Should.ThrowAsync<DomainException>(() => _handler.HandleAsync(
			UpdateCommand(student.StudentId, enrollment.StudentCourseId, teacher.TeacherId, instrumentType, stepType),
			TestContext.Current.CancellationToken));

		VerifyLeftUnchanged(enrollment, InstrumentType.Piano, StepType.Step2A);
	}

	[Theory]
	[InlineData(null, null)]
	[InlineData(InstrumentType.Voice, StepType.Step1A)]
	[Trait("AC", "269UC3")]
	public async Task HandleAsync_TheoryCourseMissingItsStepOrCarryingAnInstrumentType_IsRejectedAndLeavesTheEnrollmentUnchanged(
		InstrumentType? instrumentType,
		StepType? stepType)
	{
		var student = StudentFactory.Create();
		var enrollment = StudentCourseFactory.Create(
			studentId: student.StudentId,
			course: CourseFactory.Create(courseType: CourseType.Theory),
			instrument: new StudentInstrument(InstrumentType: null, StepType.Step4B));
		var teacher = GivenEnrollmentStudentAndTeacher(student, enrollment);

		await Should.ThrowAsync<DomainException>(() => _handler.HandleAsync(
			UpdateCommand(student.StudentId, enrollment.StudentCourseId, teacher.TeacherId, instrumentType, stepType),
			TestContext.Current.CancellationToken));

		VerifyLeftUnchanged(enrollment, expectedInstrumentType: null, StepType.Step4B);
	}

	[Theory]
	[InlineData(InstrumentType.Recorder, null)]
	[InlineData(null, StepType.Step1B)]
	[Trait("AC", "269UC4")]
	public async Task HandleAsync_CourseTypeRecordingNeitherCarryingEither_IsRejectedAndLeavesTheEnrollmentUnchanged(
		InstrumentType? instrumentType,
		StepType? stepType)
	{
		var student = StudentFactory.Create();
		var enrollment = StudentCourseFactory.Create(
			studentId: student.StudentId,
			course: CourseFactory.Create(courseType: CourseType.GREEnrichment));
		var teacher = GivenEnrollmentStudentAndTeacher(student, enrollment);

		await Should.ThrowAsync<DomainException>(() => _handler.HandleAsync(
			UpdateCommand(student.StudentId, enrollment.StudentCourseId, teacher.TeacherId, instrumentType, stepType),
			TestContext.Current.CancellationToken));

		ShouldlyHelpers.Satisfy(
			() => enrollment.Instrument.ShouldBeNull(),
			() => VerifyNothingPersisted());
	}

	[Fact]
	[Trait("AC", "269UC5")]
	public async Task HandleAsync_TeacherThatDoesNotExist_IsRejectedAndLeavesTheEnrollmentUnchanged()
	{
		var student = StudentFactory.Create();
		var enrollment = StudentCourseFactory.Create(
			studentId: student.StudentId,
			course: CourseFactory.Create(courseType: CourseType.G2Recorder));
		var originalTeacherId = enrollment.TeacherId;
		GivenEnrollmentStudentAndTeacher(student, enrollment);

		await Should.ThrowAsync<EntityNotFoundException>(() => _handler.HandleAsync(
			UpdateCommand(student.StudentId, enrollment.StudentCourseId, Guid.NewGuid()),
			TestContext.Current.CancellationToken));

		ShouldlyHelpers.Satisfy(
			() => enrollment.TeacherId.ShouldBe(originalTeacherId),
			() => VerifyNothingPersisted());
	}

	[Fact]
	[Trait("AC", "269UC6")]
	public async Task HandleAsync_EnrollmentThatDoesNotExist_ThrowsEntityNotFoundExceptionAndPersistsNothing()
	{
		var student = StudentFactory.Create();
		var enrollment = StudentCourseFactory.Create(
			studentId: student.StudentId,
			course: CourseFactory.Create(courseType: CourseType.G2Recorder));
		var teacher = GivenEnrollmentStudentAndTeacher(student, enrollment);

		await Should.ThrowAsync<EntityNotFoundException>(() => _handler.HandleAsync(
			UpdateCommand(student.StudentId, Guid.NewGuid(), teacher.TeacherId),
			TestContext.Current.CancellationToken));

		VerifyNothingPersisted();
	}

	[Fact]
	[Trait("AC", "269UC10")]
	public async Task HandleAsync_SuccessfulUpdate_RaisesTheEnrollmentUpdatedAuditEventOnTheAggregate()
	{
		var student = StudentFactory.Create();
		var enrollment = StudentCourseFactory.Create(
			studentId: student.StudentId,
			course: CourseFactory.Create(courseType: CourseType.Instrument),
			instrument: new StudentInstrument(InstrumentType.Piano, StepType.Step2A));
		var originalTeacherId = enrollment.TeacherId;
		var teacher = GivenEnrollmentStudentAndTeacher(student, enrollment);

		await _handler.HandleAsync(
			UpdateCommand(student.StudentId, enrollment.StudentCourseId, teacher.TeacherId, InstrumentType.Voice, StepType.Step1A),
			TestContext.Current.CancellationToken);

		var raised = enrollment.DrainEvents().OfType<StudentEnrollmentUpdated>().ShouldHaveSingleItem();

		ShouldlyHelpers.Satisfy(
			() => raised.Student.StudentId.ShouldBe(student.StudentId),
			() => raised.Before.TeacherId.ShouldBe(originalTeacherId),
			() => raised.Before.Instrument!.InstrumentType.ShouldBe(InstrumentType.Piano),
			() => raised.After.TeacherId.ShouldBe(teacher.TeacherId),
			() => raised.After.Instrument!.InstrumentType.ShouldBe(InstrumentType.Voice),
			() => raised.Teacher.TeacherId.ShouldBe(teacher.TeacherId));
	}

	/// <summary>
	/// Wires the two reads a successful update makes — the enrollment as the
	/// route addresses it, and the student it belongs to — and returns the
	/// teacher the directory answers with.
	/// </summary>
	private DirectoryTeacher GivenEnrollmentStudentAndTeacher(Student student, StudentCourse enrollment)
	{
		var teacher = DirectoryTeacherFactory.Create();

		_context.Repositories.StudentCourseRepositoryMock
			.Setup(r => r.GetByIdAsync(student.StudentId, enrollment.StudentCourseId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(enrollment);
		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(student);
		_context.Repositories.TeacherDirectoryMock
			.Setup(d => d.GetTeacherAsync(teacher.TeacherId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(teacher);

		return teacher;
	}

	private void VerifyLeftUnchanged(
		StudentCourse enrollment,
		InstrumentType? expectedInstrumentType,
		StepType expectedStepType) =>
		ShouldlyHelpers.Satisfy(
			() => enrollment.Instrument.ShouldNotBeNull().InstrumentType.ShouldBe(expectedInstrumentType),
			() => enrollment.Instrument.ShouldNotBeNull().StepType.ShouldBe(expectedStepType),
			() => VerifyNothingPersisted());

	private void VerifyNothingPersisted()
	{
		_context.Repositories.StudentCourseRepositoryMock.Verify(
			r => r.DeleteInstrumentAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()),
			Times.Never);
		_context.Repositories.StudentCourseRepositoryMock.Verify(
			r => r.CreateInstrumentAsync(It.IsAny<Guid>(), It.IsAny<StudentInstrument>(), It.IsAny<CancellationToken>()),
			Times.Never);
		_context.Repositories.StudentCourseRepositoryMock.Verify(
			r => r.UpdateAsync(It.IsAny<StudentCourse>(), It.IsAny<CancellationToken>()),
			Times.Never);
	}

	private static UpdateEnrollmentCommand UpdateCommand(
		Guid studentId,
		Guid studentCourseId,
		Guid teacherId,
		InstrumentType? instrumentType = null,
		StepType? stepType = null) =>
		new(studentId, studentCourseId, new UpdateEnrollmentRequest(teacherId, instrumentType, stepType));
}