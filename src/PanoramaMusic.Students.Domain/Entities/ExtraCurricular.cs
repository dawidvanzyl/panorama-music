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
		// something each caller sorts for itself, so "Monday first" is known in
		// exactly one place — here — instead of being restated by the read
		// query, the result mapping and the screen.
		_practiceTimes = [.. practiceTimes.OrderBy(slot => slot.Day).ThenBy(slot => slot.StartTime)];
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
	/// Defines an activity from its description, phase and weekly slots. An
	/// activity with no slot, or with two slots sharing a day and start time, is
	/// not a thing that can exist — so neither is constructible here.
	/// </summary>
	public static ExtraCurricular Create(
		Guid extraCurricularId,
		string description,
		PhaseType phase,
		IEnumerable<(DayType Day, TimeOnly StartTime)> slots)
	{
		var requested = slots.ToList();
		if (requested.Count == 0)
			throw new DomainException(ExtraCurricularMessages.AtLeastOnePracticeTimeRequired);

		var duplicate = requested
			.GroupBy(slot => (slot.Day, slot.StartTime))
			.FirstOrDefault(group => group.Count() > 1);
		if (duplicate is not null)
		{
			throw new DomainException(ExtraCurricularMessages.DuplicatePracticeTime(
				$"{duplicate.Key.Day} {duplicate.Key.StartTime:HH\\:mm}"));
		}

		var practiceTimes = requested.Select(slot =>
			new ExtraCurricularPracticeTime(Guid.NewGuid(), extraCurricularId, slot.Day, slot.StartTime));

		var extraCurricular = new ExtraCurricular(extraCurricularId, description, phase, practiceTimes);

		extraCurricular.Raise(new ExtraCurricularCreated(extraCurricular));
		return extraCurricular;
	}

	/// <summary>
	/// How an activity reads wherever one has to be named to a person — an audit
	/// event's target, a refusal message. Its description, which is what the
	/// interface shows too.
	/// </summary>
	public override string ToString() => Description;
}
