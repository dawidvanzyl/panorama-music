using PanoramaMusic.Students.Application.Commands.ExtraCurriculars;
using PanoramaMusic.Students.Application.Extensions;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers.ExtraCurriculars;

/// <summary>
/// Adds one weekly slot to an activity that already exists. The activity is read
/// with its slots because the uniqueness rule is about what it already holds, and
/// the activity itself is what answers it.
/// </summary>
public sealed class AddPracticeTimeHandler(IExtraCurricularRepository extraCurricularRepository)
{
	public async Task<PracticeTimeResult> HandleAsync(
		AddPracticeTimeCommand command,
		CancellationToken cancellationToken)
	{
		var extraCurricular = await extraCurricularRepository.GetByIdAsync(command.ExtraCurricularId, cancellationToken)
			?? throw new EntityNotFoundException($"Extra-curricular {command.ExtraCurricularId} was not found.");

		// The validator has already rejected an absent value, so the request's
		// nullable members are populated by the time the use case runs.
		var practiceTime = extraCurricular.AddPracticeTime(command.Request.Day!.Value, command.Request.StartTime!.Value);

		await extraCurricularRepository.CreatePracticeTimeAsync(extraCurricular, practiceTime, cancellationToken);

		return practiceTime.ToResult();
	}
}