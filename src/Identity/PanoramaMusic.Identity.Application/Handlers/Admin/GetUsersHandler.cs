using PanoramaMusic.Identity.Application.Models;
using PanoramaMusic.Identity.Domain.Interfaces;

namespace PanoramaMusic.Identity.Application.Handlers.Admin;

public sealed class GetUsersHandler(
	IUserRepository userRepository,
	IUserRoleRepository userRoleRepository)
{
	public async Task<IList<GetUserResult>> HandleAsync(CancellationToken cancellationToken)
	{
		var users = await userRepository.GetAllAsync(cancellationToken);

		var summaries = new List<GetUserResult>();
		foreach (var user in users)
		{
			var roles = await userRoleRepository.GetRolesAsync(user.UserId, cancellationToken);
			summaries.Add(new GetUserResult(user.UserId, user.Email.Value, roles, user.IsActive));
		}

		return summaries;
	}
}