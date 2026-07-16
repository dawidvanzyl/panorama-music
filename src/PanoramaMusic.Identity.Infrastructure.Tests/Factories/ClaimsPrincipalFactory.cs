using PanoramaMusic.Identity.Domain.Enums;
using System.Security.Claims;

namespace PanoramaMusic.Identity.Infrastructure.Tests.Factories;

internal static class ClaimsPrincipalFactory
{
	internal static ClaimsPrincipal Create(params Role[] roles)
	{
		var claims = new List<Claim>
		{
			new("roles", string.Join(",", roles.Select(r => r.ToString()))),
		};
		return new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"));
	}
}