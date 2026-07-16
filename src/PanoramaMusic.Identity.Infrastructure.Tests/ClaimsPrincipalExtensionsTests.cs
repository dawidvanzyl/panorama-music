using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Infrastructure.Extensions;
using PanoramaMusic.Identity.Infrastructure.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Infrastructure.Tests;

public class ClaimsPrincipalExtensionsTests
{
	[Fact]
	[Trait("AC", "M1.1UC13")]
	[Trait("AC", "M1.1UC17")]
	public void HasRole_WhenPrincipalDoesNotHaveAdminRole_ReturnsFalse()
	{
		var user = ClaimsPrincipalFactory.Create(Role.Teacher);

		user.HasRole(Role.Admin).ShouldBeFalse();
	}

	[Fact]
	[Trait("AC", "M1.1UC12")]
	public void HasRole_WhenPrincipalHasAdminRole_ReturnsTrue()
	{
		var user = ClaimsPrincipalFactory.Create(Role.Admin);

		user.HasRole(Role.Admin).ShouldBeTrue();
	}

	[Fact]
	[Trait("AC", "M1.1UC12")]
	public void HasRole_WhenPrincipalHasMultipleRolesIncludingAdmin_ReturnsTrue()
	{
		var user = ClaimsPrincipalFactory.Create(Role.Teacher, Role.Admin);

		user.HasRole(Role.Admin).ShouldBeTrue();
	}
}