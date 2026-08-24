using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Application.Extensions;

public static class ExtraCurricularExtensions
{
	/// <summary>
	/// The activity and its slots as the wire shape. The order is the aggregate's
	/// own — day of week from Monday, then start time — so nothing re-sorts here.
	/// </summary>
	public static ExtraCurricularResult ToResult(this ExtraCurricular extraCurricular) =>
		new(
			extraCurricular.ExtraCurricularId,
			extraCurricular.Description,
			extraCurricular.Phase,
			[.. extraCurricular.PracticeTimes.Select(slot =>
				new PracticeTimeResult(slot.PracticeTimeId, slot.Day, slot.StartTime))]);
}
