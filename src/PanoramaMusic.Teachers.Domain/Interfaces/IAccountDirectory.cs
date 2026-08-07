using PanoramaMusic.Teachers.Domain.ValueObjects;

namespace PanoramaMusic.Teachers.Domain.Interfaces;

/// <summary>
/// What the Teachers context needs to know about login accounts, expressed as a
/// contract it owns and Identity satisfies.
/// <para>
/// Teachers depends on Identity, never the reverse — but that dependency runs
/// through this port rather than through Identity's schema. Teachers knows which
/// accounts it has claimed; everything else about an account is Identity's to
/// answer.
/// </para>
/// </summary>
public interface IAccountDirectory
{
	/// <summary>Every account holding the Teacher role, whether linked or not.</summary>
	Task<IList<DirectoryAccount>> GetTeacherRoleAccountsAsync(CancellationToken cancellationToken);

	/// <summary>Returns null when no such account exists.</summary>
	Task<DirectoryAccount?> GetAccountAsync(Guid accountId, CancellationToken cancellationToken);

	/// <summary>
	/// Email addresses for the given accounts, keyed by id and resolved in one
	/// pass so naming the accounts on a roster costs no lookup per row.
	/// </summary>
	Task<IReadOnlyDictionary<Guid, string>> GetEmailsAsync(IReadOnlyCollection<Guid> accountIds, CancellationToken cancellationToken);
}