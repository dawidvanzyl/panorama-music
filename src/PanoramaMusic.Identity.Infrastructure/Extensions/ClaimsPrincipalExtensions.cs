using PanoramaMusic.Identity.Domain.Enums;
using System.Security.Claims;

namespace PanoramaMusic.Identity.Infrastructure.Extensions;

public static class ClaimsPrincipalExtensions
{
	private const string _rolesClaimType = "roles";

	public static bool HasRole(this ClaimsPrincipal user, Role role)
	{
		var rolesClaim = user.FindFirst(_rolesClaimType)?.Value;
		return !string.IsNullOrWhiteSpace(rolesClaim)
			&& rolesClaim
				.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
				.Any(r => Enum.TryParse<Role>(r, ignoreCase: true, out var parsed) && parsed == role);
	}
}