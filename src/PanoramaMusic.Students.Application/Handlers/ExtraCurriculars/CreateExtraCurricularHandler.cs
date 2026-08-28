using PanoramaMusic.Students.Application.Commands.ExtraCurriculars;
using PanoramaMusic.Students.Application.Extensions;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;
using PanoramaMusic.Students.Domain.Messages;

namespace PanoramaMusic.Students.Application.Handlers.ExtraCurriculars;

public sealed class CreateExtraCurricularHandler(IExtraCurricularRepository extraCurricularRepository)
{
	public async Task<ExtraCurricularResult> HandleAsync(
		CreateExtraCurricularCommand command,
		CancellationToken cancellationToken)
	{
		// The validator has already rejected an absent value, so the request's
		// nullable members are populated by the time the use case runs.
		var request = command.Request;
		var slots = request.PracticeTimes!.Select(slot => (slot.Day!.Value, slot.StartTime!.Value));
		var description = request.Description!;
		var phase = request.Phase!.Value;

		// A description is unique within its phase — the same one in the other
		// phase is a legitimately different activity. The unique constraint behind
		// this read is what settles a race; the read only buys the earlier,
		// better-explained refusal.
		var alreadyHeld = await extraCurricularRepository.ExistsInPhaseAsync(
			description, phase, null, cancellationToken);
		if (alreadyHeld)
			throw new DomainException(ExtraCurricularMessages.DuplicateDescription(phase.ToString(), description));

		var extraCurricular = ExtraCurricular.Create(
			Guid.NewGuid(),
			description,
			phase,
			slots);

		await extraCurricularRepository.CreateAsync(extraCurricular, cancellationToken);

		// Each slot is its own record, so each is written as its own step on the
		// request's ambient transaction — which is what makes the activity and
		// its slots land together.
		foreach (var practiceTime in extraCurricular.PracticeTimes)
		{
			await extraCurricularRepository.CreatePracticeTimeAsync(extraCurricular, practiceTime, cancellationToken);
		}

		return extraCurricular.ToResult();
	}
}