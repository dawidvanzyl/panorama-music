using PanoramaMusic.Domain;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Events.ExtraCurriculars;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Messages;

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
		_practiceTimes = [.. InWeekOrder(practiceTimes)];
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
	/// Adds a weekly slot to an activity that already exists and returns it. The
	/// day and start time pair is unique within this activity — and only within
	/// it, so the same pair stays available to every other activity. Nothing else
	/// can see the stored slot set, which is why the rule is answered here rather
	/// than by a request validator.
	/// </summary>
	/// <exception cref="DomainException">The activity already holds that day and start time.</exception>
	public ExtraCurricularPracticeTime AddPracticeTime(DayOfWeek day, TimeOnly startTime)
	{
		var practiceTime = new ExtraCurricularPracticeTime(Guid.NewGuid(), ExtraCurricularId, day, startTime);

		if (_practiceTimes.Any(slot => slot.Day == day && slot.StartTime == startTime))
			throw new DomainException(ExtraCurricularMessages.DuplicatePracticeTime(practiceTime.ToString()));

		// Inserted into position rather than appended: day-then-time order is this
		// aggregate's invariant, so it holds after a change and not only at
		// construction.
		var position = _practiceTimes.FindIndex(slot => ComesAfter(slot, practiceTime));
		_practiceTimes.Insert(position < 0 ? _practiceTimes.Count : position, practiceTime);

		Raise(new ExtraCurricularPracticeTimeAdded(this, practiceTime));
		return practiceTime;
	}

	/// <summary>
	/// Removes one of the activity's weekly slots and returns it. An activity must
	/// hold at least one practice time at all times, so the last one cannot be
	/// removed — it is corrected by adding its replacement first.
	/// </summary>
	/// <exception cref="EntityNotFoundException">This activity holds no such slot.</exception>
	/// <exception cref="DomainException">It is the activity's only remaining slot.</exception>
	public ExtraCurricularPracticeTime RemovePracticeTime(Guid practiceTimeId)
	{
		// Looked up by its own identity, never by day and start time: another
		// activity may legitimately hold the same pair.
		var practiceTime = _practiceTimes.SingleOrDefault(slot => slot.PracticeTimeId == practiceTimeId)
			?? throw new EntityNotFoundException($"Practice time {practiceTimeId} was not found on activity {ExtraCurricularId}.");

		if (_practiceTimes.Count == 1)
			throw new DomainException(ExtraCurricularMessages.AtLeastOnePracticeTimeRequired);

		_practiceTimes.Remove(practiceTime);

		Raise(new ExtraCurricularPracticeTimeRemoved(this, practiceTime));
		return practiceTime;
	}

	/// <summary>Slots in day-of-week order from Monday, then by start time.</summary>
	private static IEnumerable<ExtraCurricularPracticeTime> InWeekOrder(IEnumerable<ExtraCurricularPracticeTime> practiceTimes) =>
		practiceTimes.OrderBy(slot => WeekOrderOf(slot.Day)).ThenBy(slot => slot.StartTime);

	/// <summary>Whether <paramref name="slot"/> falls later in the week than <paramref name="other"/>.</summary>
	private static bool ComesAfter(ExtraCurricularPracticeTime slot, ExtraCurricularPracticeTime other) =>
		(WeekOrderOf(slot.Day), slot.StartTime).CompareTo((WeekOrderOf(other.Day), other.StartTime)) > 0;

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