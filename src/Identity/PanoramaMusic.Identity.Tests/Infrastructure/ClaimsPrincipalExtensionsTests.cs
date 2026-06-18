using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Infrastructure.Extensions;
using Shouldly;
using System.Security.Claims;
using Xunit;

namespace PanoramaMusic.Tests.Identity.Infrastructure;

public class ClaimsPrincipalExtensionsTests
{
	private static ClaimsPrincipal BuildPrincipal(params Role[] roles)
	{
		var claims = new List<Claim>
		{
			new("roles", string.Join(",", roles.Select(r => r.ToString()))),
		};
		return new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"));
	}

	[Fact]
	[Trait("AC", "M1.1UC13")]
	public void HasRole_WhenPrincipalDoesNotHaveAdminRole_ReturnsFalse()
	{
		var user = BuildPrincipal(Role.Teacher);

		user.HasRole(Role.Admin).ShouldBeFalse();
	}

	[Fact]
	public void HasRole_WhenPrincipalHasAdminRole_ReturnsTrue()
	{
		var user = BuildPrincipal(Role.Admin);

		user.HasRole(Role.Admin).ShouldBeTrue();
	}

	[Fact]
	public void HasRole_WhenPrincipalHasMultipleRolesIncludingAdmin_ReturnsTrue()
	{
		var user = BuildPrincipal(Role.Teacher, Role.Admin);

		user.HasRole(Role.Admin).ShouldBeTrue();
	}
}