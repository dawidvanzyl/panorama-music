using PanoramaMusic.Students.Application.Commands.ExtraCurriculars;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;
using PanoramaMusic.Students.Domain.Messages;

namespace PanoramaMusic.Students.Application.Handlers.ExtraCurriculars;

/// <summary>
/// Removes an activity from the catalogue, but only while no student takes part
/// in it — an activity with assignments against it stays and its description is
/// corrected instead. Its practice times go with it through the schema's
/// cascade, so no slot is left orphaned.
/// </summary>
public sealed class DeleteExtraCurricularHandler(
	IExtraCurricularRepository extraCurricularRepository,
	IStudentExtraCurricularRepository studentExtraCurricularRepository)
{
	public async Task HandleAsync(DeleteExtraCurricularCommand command, CancellationToken cancellationToken)
	{
		var extraCurricular = await extraCurricularRepository.GetByIdAsync(command.ExtraCurricularId, cancellationToken)
			?? throw new EntityNotFoundException($"Extra-curricular {command.ExtraCurricularId} was not found.");

		// The screen reads the count to decide what to offer, but the rule is
		// enforced here regardless of what the screen did.
		var assignedStudents = await studentExtraCurricularRepository
			.CountByExtraCurricularIdAsync(command.ExtraCurricularId, cancellationToken);
		if (assignedStudents > 0)
		{
			throw new DomainException(ExtraCurricularMessages.CannotDeleteWithAssignedStudents(
				extraCurricular.Description, assignedStudents));
		}

		extraCurricular.MarkDeleted();

		await extraCurricularRepository.DeleteAsync(extraCurricular, cancellationToken);
	}
}