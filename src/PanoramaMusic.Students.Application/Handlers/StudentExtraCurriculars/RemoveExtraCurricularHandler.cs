using PanoramaMusic.Students.Application.Commands.StudentExtraCurriculars;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers.StudentExtraCurriculars;

/// <summary>
/// Removes one of the student's assignments. Only the link goes — the student and
/// the activity both remain, and the student's other assignments are untouched.
/// </summary>
public sealed class RemoveExtraCurricularHandler(
	IStudentRepository studentRepository,
	IStudentExtraCurricularRepository studentExtraCurricularRepository)
{
	public async Task HandleAsync(RemoveExtraCurricularCommand command, CancellationToken cancellationToken)
	{
		var student = await studentRepository.GetByIdAsync(command.StudentId, cancellationToken)
			?? throw new EntityNotFoundException($"Student {command.StudentId} was not found.");

		// The student's assignments arrive resolved in one read, so the one being
		// removed is picked out of that list rather than fetched on its own — the
		// removal event names the activity, which needs the activity anyway.
		var assignments = await studentExtraCurricularRepository.GetByStudentIdAsync(student.StudentId, cancellationToken);

		var assignment = assignments.SingleOrDefault(a => a.ExtraCurricular.ExtraCurricularId == command.ExtraCurricularId)
			?? throw new EntityNotFoundException(
				$"Student {command.StudentId} does not take part in extra-curricular {command.ExtraCurricularId}.");

		assignment.MarkRemoved(student);

		await studentExtraCurricularRepository.DeleteAsync(assignment, cancellationToken);
	}
}