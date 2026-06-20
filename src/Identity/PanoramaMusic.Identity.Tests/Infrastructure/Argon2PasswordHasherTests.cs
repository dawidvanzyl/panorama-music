using PanoramaMusic.Identity.Infrastructure.Services;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Tests.Identity.Infrastructure;

public class Argon2PasswordHasherTests
{
	[Fact]
	[Trait("AC", "M1UC16")]
	public void Hash_WhenPasswordProvided_ReturnsNonEmptyHash()
	{
		var hasher = new Argon2PasswordHashService();

		var result = hasher.Hash("secret");

		result.Value.ShouldNotBeNullOrWhiteSpace();
	}

	[Fact]
	[Trait("AC", "M1UC17")]
	public void Verify_WhenCorrectPassword_ReturnsTrue()
	{
		var hasher = new Argon2PasswordHashService();
		var hash = hasher.Hash("correct-password");

		var result = hasher.Verify("correct-password", hash);

		result.ShouldBeTrue();
	}

	[Fact]
	[Trait("AC", "M1UC18")]
	public void Verify_WhenWrongPassword_ReturnsFalse()
	{
		var hasher = new Argon2PasswordHashService();
		var hash = hasher.Hash("original-password");

		var result = hasher.Verify("different-password", hash);

		result.ShouldBeFalse();
	}
}