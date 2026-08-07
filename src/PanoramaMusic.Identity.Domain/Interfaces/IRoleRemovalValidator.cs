using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Domain.ValueObjects;

namespace PanoramaMusic.Identity.Domain.Interfaces;

/// <summary>
/// A veto over removing a role from a user, owned by Identity and implemented
/// by the contexts that depend on it.
/// <para>
/// Contexts may attach meaning to a role that Identity knows nothing about — a
/// teacher record linked to an account, say — and removing the role would strip
/// the permissions that meaning rests on. Rather than Identity reaching into
/// those contexts to find out, each one registers a validator here. Identity's
/// role update path consults every registered validator before applying a change
/// and rejects the change if any of them objects, without ever learning why
/// beyond the message it is handed.
/// </para>
/// </summary>
public interface IRoleRemovalValidator
{
	/// <summary>
	/// Returns a successful result when this role may be removed from this user,
	/// otherwise a failure carrying the reason, phrased for the caller who
	/// attempted it.
	/// </summary>
	Task<ValidationResult> ValidateRemoveAsync(Guid userId, Role role, CancellationToken cancellationToken);
}