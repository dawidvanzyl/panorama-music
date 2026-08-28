using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Domain.Interfaces;

public interface IExtraCurricularRepository
{
	/// <summary>
	/// Every activity with its practice times already attached, read in a single
	/// query rather than a slot lookup per activity. A phase narrows the result
	/// to activities offered to that phase; null returns them all.
	/// </summary>
	Task<IList<ExtraCurricular>> GetAllAsync(PhaseType? phase, CancellationToken cancellationToken);

	/// <summary>
	/// One activity with its practice times attached, or null when no activity
	/// carries that identifier. This is what the slot-maintenance use cases load,
	/// since both of their rules are about the slots the activity already holds.
	/// </summary>
	Task<ExtraCurricular?> GetByIdAsync(Guid extraCurricularId, CancellationToken cancellationToken);

	/// <summary>
	/// Whether the phase already offers an activity carrying that description,
	/// ignoring the activity named by <paramref name="excludingExtraCurricularId"/>
	/// — which is how an edit avoids colliding with itself. The unique constraint
	/// is still what settles a race between two requests; this only buys the
	/// earlier, better-explained refusal.
	/// </summary>
	Task<bool> ExistsInPhaseAsync(
		string description,
		PhaseType phase,
		Guid? excludingExtraCurricularId,
		CancellationToken cancellationToken);

	/// <summary>Persists the activity itself. Its slots are written one at a time by
	/// <see cref="CreatePracticeTimeAsync"/>, sequenced by the caller.</summary>
	Task CreateAsync(ExtraCurricular extraCurricular, CancellationToken cancellationToken);

	/// <summary>
	/// Persists the activity's corrected description and phase. Its practice times
	/// are not reachable from here — an edit never changes their composition.
	/// </summary>
	Task UpdateAsync(ExtraCurricular extraCurricular, CancellationToken cancellationToken);

	/// <summary>
	/// Removes the activity. Its practice times go with it through the schema's
	/// cascade, so this stays a single delete rather than a slot-by-slot sweep.
	/// </summary>
	Task DeleteAsync(ExtraCurricular extraCurricular, CancellationToken cancellationToken);

	/// <summary>
	/// Persists one weekly slot against the activity that owns it. The activity is
	/// passed alongside because it is the aggregate root that carries the pending
	/// events, and this is the write that persists what its behaviour did.
	/// </summary>
	Task CreatePracticeTimeAsync(
		ExtraCurricular extraCurricular,
		ExtraCurricularPracticeTime practiceTime,
		CancellationToken cancellationToken);

	/// <summary>Removes one weekly slot from the activity that owns it.</summary>
	Task DeletePracticeTimeAsync(
		ExtraCurricular extraCurricular,
		ExtraCurricularPracticeTime practiceTime,
		CancellationToken cancellationToken);
}