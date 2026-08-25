using PanoramaMusic.Students.Application.Commands.ExtraCurriculars;
using PanoramaMusic.Students.Application.Extensions;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Interfaces;

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

		var extraCurricular = ExtraCurricular.Create(
			Guid.NewGuid(),
			request.Description!,
			request.Phase!.Value,
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