using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Tests.Factories;

public static class ExtraCurricularFactory
{
	/// <summary>
	/// An activity built straight through its constructor, so a test can hand it
	/// slots in whatever order it likes — including an order the aggregate is
	/// expected to correct.
	/// </summary>
	public static ExtraCurricular Create(
		Guid? extraCurricularId = null,
		string description = "Marimba Band",
		PhaseType phase = PhaseType.Junior,
		params (DayType Day, TimeOnly StartTime)[] slots)
	{
		var activityId = extraCurricularId ?? Guid.NewGuid();
		var requested = slots.Length > 0
			? slots
			: [(DayType.Monday, new TimeOnly(15, 0))];

		return new ExtraCurricular(
			activityId,
			description,
			phase,
			requested.Select(slot => new ExtraCurricularPracticeTime(
				Guid.NewGuid(), activityId, slot.Day, slot.StartTime)));
	}
}