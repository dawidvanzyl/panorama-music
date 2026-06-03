using PanoramaMusic.Identity.Domain.Entities;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Tests.Identity.Domain;

public class RefreshTokenTests
{
	[Fact]
	[Trait("AC", "M1UC7")]
	public void IsExpired_WhenExpiresAtInPast_ReturnsTrue()
	{
		var token = new RefreshToken(Guid.NewGuid(), Guid.NewGuid(), "hash", DateTime.UtcNow.AddMinutes(-1));

		token.IsExpired.ShouldBeTrue();
	}

	[Fact]
	[Trait("AC", "M1UC8")]
	public void IsRevoked_WhenRevokedAtSet_ReturnsTrue()
	{
		var token = new RefreshToken(Guid.NewGuid(), Guid.NewGuid(), "hash", DateTime.UtcNow.AddHours(1));

		token.Revoke();

		token.IsRevoked.ShouldBeTrue();
	}
}