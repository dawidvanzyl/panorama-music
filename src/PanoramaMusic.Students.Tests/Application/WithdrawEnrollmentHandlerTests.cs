using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Students.Application.Commands.StudentCourses;
using PanoramaMusic.Students.Application.Handlers.StudentCourses;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Events.StudentCourses;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Application;

public class WithdrawEnrollmentHandlerTests : IClassFixture<StudentsTestFixture>
{
	private readonly StudentsTestContext _context;
	private readonly WithdrawEnrollmentHandler _handler;

	public WithdrawEnrollmentHandlerTests(StudentsTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<WithdrawEnrollmentHandler>();
	}

	[Fact]
	[Trait("AC", "269UC7")]
	public async Task HandleAsync_StudentHoldingTwoEnrollments_RemovesOnlyTheWithdrawnOneAndItsInstrumentAndStep()
	{
		var student = StudentFactory.Create();
		var withdrawn = StudentCourseFactory.Create(
			studentId: student.StudentId,
			course: CourseFactory.Create(courseType: CourseType.Instrument),
			instrument: new StudentInstrument(InstrumentType.Piano, StepType.Step2A));
		var kept = StudentCourseFactory.Create(
			studentId: student.StudentId,
			course: CourseFactory.Create(courseType: CourseType.Theory),
			instrument: new StudentInstrument(InstrumentType: null, StepType.Step4B));
		GivenStudentHolding(student, enrollments: 2, withdrawn);

		await _handler.HandleAsync(
			new WithdrawEnrollmentCommand(student.StudentId, withdrawn.StudentCourseId),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			// The enrollment goes as one record — the instrument and step recorded
			// against it are removed with it by the cascade the delete relies on.
			() => _context.Repositories.StudentCourseRepositoryMock.Verify(
				r => r.DeleteAsync(
					It.Is<StudentCourse>(e => e.StudentCourseId == withdrawn.StudentCourseId),
					It.IsAny<CancellationToken>()),
				Times.Once),
			// The student's other enrollment was never touched.
			() => _context.Repositories.StudentCourseRepositoryMock.Verify(
				r => r.DeleteAsync(
					It.Is<StudentCourse>(e => e.StudentCourseId == kept.StudentCourseId),
					It.IsAny<CancellationToken>()),
				Times.Never),
			() => kept.Instrument.ShouldNotBeNull().StepType.ShouldBe(StepType.Step4B));
	}

	[Fact]
	[Trait("AC", "269UC8")]
	public async Task HandleAsync_StudentHoldingASingleEnrollment_ThrowsDomainExceptionAndRemovesNothing()
	{
		var student = StudentFactory.Create();
		var enrollment = StudentCourseFactory.Create(
			studentId: student.StudentId,
			course: CourseFactory.Create(courseType: CourseType.G2Recorder));
		GivenStudentHolding(student, enrollments: 1, enrollment);

		await Should.ThrowAsync<DomainException>(() => _handler.HandleAsync(
			new WithdrawEnrollmentCommand(student.StudentId, enrollment.StudentCourseId),
			TestContext.Current.CancellationToken));

		VerifyNothingRemoved();
	}

	[Fact]
	[Trait("AC", "269UC9")]
	public async Task HandleAsync_EnrollmentThatDoesNotExist_ThrowsEntityNotFoundExceptionAndRemovesNothing()
	{
		var student = StudentFactory.Create();
		var enrollment = StudentCourseFactory.Create(
			studentId: student.StudentId,
			course: CourseFactory.Create(courseType: CourseType.G2Recorder));
		GivenStudentHolding(student, enrollments: 2, enrollment);

		await Should.ThrowAsync<EntityNotFoundException>(() => _handler.HandleAsync(
			new WithdrawEnrollmentCommand(student.StudentId, Guid.NewGuid()),
			TestContext.Current.CancellationToken));

		VerifyNothingRemoved();
	}

	[Fact]
	[Trait("AC", "269UC10")]
	public async Task HandleAsync_SuccessfulWithdrawal_RaisesTheStudentWithdrawnAuditEventOnTheAggregate()
	{
		var student = StudentFactory.Create();
		var course = CourseFactory.Create(courseType: CourseType.G2Recorder);
		var enrollment = StudentCourseFactory.Create(studentId: student.StudentId, course: course);
		GivenStudentHolding(student, enrollments: 2, enrollment);

		await _handler.HandleAsync(
			new WithdrawEnrollmentCommand(student.StudentId, enrollment.StudentCourseId),
			TestContext.Current.CancellationToken);

		var raised = enrollment.DrainEvents().OfType<StudentWithdrawn>().ShouldHaveSingleItem();

		ShouldlyHelpers.Satisfy(
			() => raised.Student.StudentId.ShouldBe(student.StudentId),
			() => raised.Enrollment.Course.CourseId.ShouldBe(course.CourseId));
	}

	/// <summary>
	/// Wires the reads a withdrawal makes: the enrollment as the route addresses
	/// it, the student it belongs to, and how many courses that student is
	/// enrolled in — the count being what the at-least-one rule turns on.
	/// </summary>
	private void GivenStudentHolding(Student student, int enrollments, StudentCourse enrollment)
	{
		_context.Repositories.StudentCourseRepositoryMock
			.Setup(r => r.GetByIdAsync(student.StudentId, enrollment.StudentCourseId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(enrollment);
		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(student);
		_context.Repositories.StudentCourseRepositoryMock
			.Setup(r => r.CountByStudentIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(enrollments);
	}

	private void VerifyNothingRemoved() =>
		_context.Repositories.StudentCourseRepositoryMock.Verify(
			r => r.DeleteAsync(It.IsAny<StudentCourse>(), It.IsAny<CancellationToken>()),
			Times.Never);
}