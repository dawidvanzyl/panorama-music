using PanoramaMusic.Teachers.Domain.Entities;
using PanoramaMusic.Teachers.Domain.ValueObjects;

namespace PanoramaMusic.Teachers.Domain.Interfaces;

public interface ITeacherRepository
{
	Task<Teacher?> GetByIdAsync(Guid teacherId, CancellationToken cancellationToken);

	Task<IList<Teacher>> GetAllAsync(CancellationToken cancellationToken);

	Task CreateAsync(Teacher teacher, CancellationToken cancellationToken);

	Task UpdateProfileAsync(Teacher teacher, CancellationToken cancellationToken);

	Task UpdateClassificationAsync(Teacher teacher, CancellationToken cancellationToken);

	/// <summary>
	/// Every login account eligible for linking. Eligibility is resolved where
	/// the set is produced rather than by filtering a fuller list afterwards —
	/// it is a correctness constraint, not a presentation one.
	/// </summary>
	Task<IList<LinkableAccount>> GetLinkableAccountsAsync(CancellationToken cancellationToken);

	/// <summary>Returns null when no such login account exists.</summary>
	Task<AccountLinkState?> GetAccountLinkStateAsync(Guid accountId, CancellationToken cancellationToken);

	Task LinkAccountAsync(Teacher teacher, CancellationToken cancellationToken);

	Task UnlinkAccountAsync(Teacher teacher, CancellationToken cancellationToken);
}