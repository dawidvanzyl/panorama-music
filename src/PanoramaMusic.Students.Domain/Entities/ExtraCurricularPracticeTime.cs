using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Domain.Entities;

/// <summary>
/// One weekly practice slot belonging to an extra-curricular activity. The start
/// time is a time of day with no date component — a slot recurs every week and
/// has no calendar identity of its own.
/// </summary>
public sealed class ExtraCurricularPracticeTime
{
	public ExtraCurricularPracticeTime(Guid practiceTimeId, Guid extraCurricularId, DayType day, TimeOnly startTime)
	{
		PracticeTimeId = practiceTimeId;
		ExtraCurricularId = extraCurricularId;
		Day = day;
		StartTime = startTime;
	}

	public Guid PracticeTimeId { get; }

	public Guid ExtraCurricularId { get; }

	public DayType Day { get; }

	public TimeOnly StartTime { get; }

	/// <summary>
	/// How a slot reads wherever one has to be named to a person — a refusal
	/// message, an audit event's target. Twenty-four hour, no seconds, which is
	/// also what the interface shows.
	/// </summary>
	public override string ToString() => $"{Day} {StartTime:HH\\:mm}";
}
