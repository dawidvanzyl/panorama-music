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

	/// <summary>Persists the activity together with every practice time it owns.</summary>
	Task CreateAsync(ExtraCurricular extraCurricular, CancellationToken cancellationToken);
}