using PanoramaMusic.Students.Application.Commands.ExtraCurriculars;
using PanoramaMusic.Students.Application.Extensions;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;
using PanoramaMusic.Students.Domain.Messages;

namespace PanoramaMusic.Students.Application.Handlers.ExtraCurriculars;

/// <summary>
/// Corrects an activity's description and the phase it is offered to. The
/// practice times are not reachable from here — they are maintained on their own
/// surface, and an edit leaves the slot set exactly as it stands.
/// </summary>
public sealed class UpdateExtraCurricularHandler(IExtraCurricularRepository extraCurricularRepository)
{
	public async Task<ExtraCurricularResult> HandleAsync(
		UpdateExtraCurricularCommand command,
		CancellationToken cancellationToken)
	{
		var extraCurricular = await extraCurricularRepository.GetByIdAsync(command.ExtraCurricularId, cancellationToken)
			?? throw new EntityNotFoundException($"Extra-curricular {command.ExtraCurricularId} was not found.");

		// The validator has already rejected an absent value.
		var request = command.Request;
		var description = request.Description!;
		var phase = request.Phase!.Value;

		// Excluding this activity is what makes renaming it to the description and
		// phase it already holds permitted rather than a collision with itself.
		var alreadyHeld = await extraCurricularRepository.ExistsInPhaseAsync(
			description, phase, command.ExtraCurricularId, cancellationToken);
		if (alreadyHeld)
			throw new DomainException(ExtraCurricularMessages.DuplicateDescription(phase.ToString(), description));

		extraCurricular.Update(description, phase);

		await extraCurricularRepository.UpdateAsync(extraCurricular, cancellationToken);

		return extraCurricular.ToResult();
	}
}