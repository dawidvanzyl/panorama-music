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

	/// <summary>Persists the activity itself. Its slots are written one at a time by
	/// <see cref="CreatePracticeTimeAsync"/>, sequenced by the caller.</summary>
	Task CreateAsync(ExtraCurricular extraCurricular, CancellationToken cancellationToken);

	/// <summary>Persists one weekly slot against the activity that owns it.</summary>
	Task CreatePracticeTimeAsync(ExtraCurricularPracticeTime practiceTime, CancellationToken cancellationToken);
}