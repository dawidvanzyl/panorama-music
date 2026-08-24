using PanoramaMusic.Domain;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Events.ExtraCurriculars;

namespace PanoramaMusic.Students.Domain.Entities;

/// <summary>
/// An extra-curricular activity the school offers. It owns its weekly practice
/// times: they are created with it, they cannot exist without it, and the
/// activity is the only thing that can hand them out.
/// </summary>
public sealed class ExtraCurricular : AggregateRoot
{
	private readonly List<ExtraCurricularPracticeTime> _practiceTimes;

	public ExtraCurricular(
		Guid extraCurricularId,
		string description,
		PhaseType phase,
		IEnumerable<ExtraCurricularPracticeTime> practiceTimes)
	{
		ExtraCurricularId = extraCurricularId;
		Description = description;
		Phase = phase;

		// Day-then-time order is an invariant of the activity rather than
		// something each caller sorts for itself, so "the week starts on Monday"
		// is known in exactly one place — here — instead of being restated by the
		// read query, the result mapping and the screen.
		_practiceTimes = [.. practiceTimes.OrderBy(slot => WeekOrderOf(slot.Day)).ThenBy(slot => slot.StartTime)];
	}

	public Guid ExtraCurricularId { get; }

	public string Description { get; }

	public PhaseType Phase { get; }

	/// <summary>
	/// The activity's weekly slots, in day-of-week order from Monday and then by
	/// start time.
	/// </summary>
	public IReadOnlyList<ExtraCurricularPracticeTime> PracticeTimes => _practiceTimes;

	/// <summary>
	/// Defines an activity from its description, phase and weekly slots. The
	/// request validator is what refuses an empty or self-duplicating slot set,
	/// so the rules are stated once, at the boundary, rather than again here.
	/// </summary>
	public static ExtraCurricular Create(
		Guid extraCurricularId,
		string description,
		PhaseType phase,
		IEnumerable<(DayOfWeek Day, TimeOnly StartTime)> slots)
	{
		var practiceTimes = slots.Select(slot =>
			new ExtraCurricularPracticeTime(Guid.NewGuid(), extraCurricularId, slot.Day, slot.StartTime));

		var extraCurricular = new ExtraCurricular(extraCurricularId, description, phase, practiceTimes);

		extraCurricular.Raise(new ExtraCurricularCreated(extraCurricular));
		return extraCurricular;
	}

	/// <summary>
	/// Where a day falls in the school week, which starts on Monday.
	/// <see cref="DayOfWeek"/> numbers Sunday as 0, so sorting on the bare member
	/// would lead with Sunday; shifting by six rotates the week without needing
	/// an enum of our own.
	/// </summary>
	private static int WeekOrderOf(DayOfWeek day) => ((int)day + 6) % 7;

	/// <summary>
	/// How an activity reads wherever one has to be named to a person — an audit
	/// event's target, a refusal message. Its description, which is what the
	/// interface shows too.
	/// </summary>
	public override string ToString() => Description;
}