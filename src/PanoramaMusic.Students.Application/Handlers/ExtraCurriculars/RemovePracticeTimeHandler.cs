using PanoramaMusic.Students.Application.Commands.ExtraCurriculars;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers.ExtraCurriculars;

/// <summary>
/// Removes one weekly slot from an activity. An activity must keep at least one
/// practice time, which only the activity can judge — so it is read with its
/// slots and asked, rather than counted here.
/// </summary>
public sealed class RemovePracticeTimeHandler(IExtraCurricularRepository extraCurricularRepository)
{
	public async Task HandleAsync(RemovePracticeTimeCommand command, CancellationToken cancellationToken)
	{
		var extraCurricular = await extraCurricularRepository.GetByIdAsync(command.ExtraCurricularId, cancellationToken)
			?? throw new EntityNotFoundException($"Extra-curricular {command.ExtraCurricularId} was not found.");

		var practiceTime = extraCurricular.RemovePracticeTime(command.PracticeTimeId);

		await extraCurricularRepository.DeletePracticeTimeAsync(extraCurricular, practiceTime, cancellationToken);
	}
}