using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Application.Models;
using PanoramaMusic.Identity.Domain.Interfaces;

namespace PanoramaMusic.Identity.Application.Handlers.Admin;

public sealed class GetUsersHandler(
	IUserRepository userRepository,
	IUserRoleRepository userRoleRepository,
	IAdminOptions adminOptions)
{
	public async Task<IList<GetUserResult>> HandleAsync(CancellationToken cancellationToken)
	{
		var users = await userRepository.GetAllAsync(cancellationToken);

		var summaries = new List<GetUserResult>();
		foreach (var user in users)
		{
			var roles = await userRoleRepository.GetRolesAsync(user.UserId, cancellationToken);
			var isProtected = !string.IsNullOrEmpty(adminOptions.SeedAdminEmail) &&
				string.Equals(user.Email.Value, adminOptions.SeedAdminEmail, StringComparison.OrdinalIgnoreCase);
			summaries.Add(new GetUserResult(user.UserId, user.Email.Value, roles, user.IsActive, isProtected));
		}

		return summaries;
	}
}