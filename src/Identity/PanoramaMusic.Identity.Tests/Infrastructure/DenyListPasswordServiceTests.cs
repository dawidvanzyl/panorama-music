using PanoramaMusic.Identity.Infrastructure.Services;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Tests.Infrastructure;

public class DenyListPasswordServiceTests
{
	private readonly DenyListPasswordService _denyListPasswordService = new();

	[Theory]
	[InlineData("password")]
	[InlineData("123456")]
	[InlineData("PASSWORD")]
	[Trait("AC", "M1.4UC2")]
	public void Validate_KnownCommonPassword_ReturnsFalse(string password)
	{
		_denyListPasswordService.Validate(password).ShouldBeFalse();
	}

	[Fact]
	[Trait("AC", "M1.4UC2")]
	public void Validate_PasswordNotCommon_ReturnsTrue()
	{
		_denyListPasswordService.Validate("xK9$qzL2!mPvR7nE").ShouldBeTrue();
	}
}