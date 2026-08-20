using PanoramaMusic.Students.Application.Commands.StudentCourses;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;
using PanoramaMusic.Students.Domain.Messages;

namespace PanoramaMusic.Students.Application.Handlers.StudentCourses;

/// <summary>
/// Withdraws a student from a course, removing the enrollment along with the
/// instrument and step recorded against it — this milestone keeps no
/// withdrawn-but-retained state. Refused while it is the student's last
/// remaining enrollment.
/// </summary>
public sealed class WithdrawEnrollmentHandler(
	IStudentRepository studentRepository,
	IStudentCourseRepository studentCourseRepository)
{
	public async Task HandleAsync(WithdrawEnrollmentCommand command, CancellationToken cancellationToken)
	{
		var enrollment = await studentCourseRepository.GetByIdAsync(command.StudentId, command.StudentCourseId, cancellationToken)
			?? throw new EntityNotFoundException($"Enrollment {command.StudentCourseId} was not found.");

		var student = await studentRepository.GetByIdAsync(command.StudentId, cancellationToken)
			?? throw new EntityNotFoundException($"Student {command.StudentId} was not found.");

		// A count rather than a read of every enrollment the student holds — the
		// rule only needs to know whether this is the last one.
		var enrollments = await studentCourseRepository.CountByStudentIdAsync(command.StudentId, cancellationToken);
		if (enrollments <= 1)
			throw new DomainException(StudentEnrollmentMessages.LastEnrollmentCannotBeWithdrawn);

		enrollment.MarkWithdrawn(student);

		await studentCourseRepository.DeleteAsync(enrollment, cancellationToken);
	}
}