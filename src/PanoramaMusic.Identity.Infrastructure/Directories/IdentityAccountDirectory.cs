using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Teachers.Domain.Interfaces;
using PanoramaMusic.Teachers.Domain.ValueObjects;

namespace PanoramaMusic.Identity.Infrastructure.Directories;

/// <summary>
/// Identity's answer to the Teachers context's <see cref="IAccountDirectory"/>.
/// <para>
/// The port is declared by Teachers, which needs the data; the implementation
/// lives here, because who holds a role and what their email is are Identity's
/// facts to publish. Teachers never learns that a "user" is what backs a
/// <see cref="DirectoryAccount"/> — the same shape as
/// <c>IAuditEventTranslator</c>, which Audit declares and each producing
/// context implements over its own domain.
/// </para>
/// </summary>
public sealed class IdentityAccountDirectory(
	IUserRepository userRepository,
	IUserRoleRepository userRoleRepository) : IAccountDirectory
{
	public async Task<IList<DirectoryAccount>> GetTeacherRoleAccountsAsync(CancellationToken cancellationToken)
	{
		var users = await userRepository.GetByRoleAsync(Role.Teacher, cancellationToken);

		return [.. users.Select(user => new DirectoryAccount(user.UserId, user.Email.Value, HasTeacherRole: true))];
	}

	public async Task<DirectoryAccount?> GetAccountAsync(Guid accountId, CancellationToken cancellationToken)
	{
		var user = await userRepository.GetByIdAsync(accountId, cancellationToken);
		if (user is null)
			return null;

		var roles = await userRoleRepository.GetRolesAsync(accountId, cancellationToken);

		return new DirectoryAccount(user.UserId, user.Email.Value, roles.Contains(Role.Teacher));
	}

	public async Task<IReadOnlyDictionary<Guid, string>> GetEmailsAsync(IReadOnlyCollection<Guid> accountIds, CancellationToken cancellationToken)
	{
		var users = await userRepository.GetByIdsAsync(accountIds, cancellationToken);

		return users.ToDictionary(user => user.UserId, user => user.Email.Value);
	}
}