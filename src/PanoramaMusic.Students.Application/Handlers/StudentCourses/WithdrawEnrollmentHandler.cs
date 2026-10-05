using PanoramaMusic.Students.Application.Commands.StudentCourses;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;
using PanoramaMusic.Students.Domain.ValueObjects;

namespace PanoramaMusic.Students.Application.Handlers.StudentCourses;

/// <summary>
/// Withdraws a student from a course, removing the enrollment along with the
/// instrument and step recorded against it — this milestone keeps no
/// withdrawn-but-retained state. Refused when it would leave the student with
/// neither a course nor an extra-curricular.
/// </summary>
public sealed class WithdrawEnrollmentHandler(
	IStudentRepository studentRepository,
	IStudentCourseRepository studentCourseRepository,
	IStudentExtraCurricularRepository studentExtraCurricularRepository)
{
	public async Task HandleAsync(WithdrawEnrollmentCommand command, CancellationToken cancellationToken)
	{
		var enrollment = await studentCourseRepository.GetByIdAsync(command.StudentId, command.StudentCourseId, cancellationToken)
			?? throw new EntityNotFoundException($"Enrollment {command.StudentCourseId} was not found.");

		var student = await studentRepository.GetByIdAsync(command.StudentId, cancellationToken)
			?? throw new EntityNotFoundException($"Student {command.StudentId} was not found.");

		// Counts rather than a read of every row — the rule only needs the numbers.
		var enrollments = await studentCourseRepository.CountByStudentIdAsync(command.StudentId, cancellationToken);
		var assignments = await studentExtraCurricularRepository.CountByStudentIdAsync(command.StudentId, cancellationToken);
		new StudentHoldings(enrollments, assignments).EnsureEnrollmentCanBeWithdrawn();

		enrollment.MarkWithdrawn(student);

		await studentCourseRepository.DeleteAsync(enrollment, cancellationToken);
	}
}