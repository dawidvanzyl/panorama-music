using PanoramaMusic.Teachers.Domain.ValueObjects;

namespace PanoramaMusic.Teachers.Domain.Interfaces;

/// <summary>
/// What the Teachers context needs to know about login accounts, declared by the
/// context that consumes it and implemented by the one that owns the data.
/// <para>
/// Teachers knows which accounts it has claimed; everything else about an
/// account is someone else's to answer, and Teachers never learns who or how.
/// There are no users behind this interface as far as this context is
/// concerned — only accounts, in the shape it asked for. The reverse direction
/// takes the same form: Identity declares <c>IRoleRemovalValidator</c> and
/// Teachers implements it, because that fact belongs to Teachers.
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