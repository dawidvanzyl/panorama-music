using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Teachers.Domain.Interfaces;
using PanoramaMusic.Teachers.Domain.ValueObjects;

namespace PanoramaMusic.Teachers.Infrastructure.Directories;

/// <summary>
/// Satisfies the Teachers context's <see cref="IAccountDirectory"/> by asking
/// Identity's own repositories, so no Teachers query reaches into the identity
/// schema. This adapter is the single place the two contexts touch.
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