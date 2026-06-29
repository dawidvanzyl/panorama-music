using PanoramaMusic.Identity.Domain.Entities;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Tests.Domain;

public class RefreshTokenTests
{
	private static RefreshToken CreateToken(DateTime expiresAt, DateTime? sessionStartedAt = null)
	{
		var tokenId = Guid.NewGuid();
		return new RefreshToken(tokenId, Guid.NewGuid(), "hash", expiresAt, tokenId, sessionStartedAt ?? DateTime.UtcNow);
	}

	[Fact]
	[Trait("AC", "M1UC7")]
	public void IsExpired_WhenExpiresAtInPast_ReturnsTrue()
	{
		var token = CreateToken(DateTime.UtcNow.AddMinutes(-1));

		token.IsExpired.ShouldBeTrue();
	}

	[Fact]
	[Trait("AC", "M1UC8")]
	public void IsRevoked_WhenRevokedAtSet_ReturnsTrue()
	{
		var token = CreateToken(DateTime.UtcNow.AddHours(1));

		token.Revoke();

		token.IsRevoked.ShouldBeTrue();
	}

	[Fact]
	[Trait("AC", "M1.4UC5")]
	public void IsSessionExpired_WhenSessionOlderThanAbsoluteLifetime_ReturnsTrue()
	{
		var token = CreateToken(DateTime.UtcNow.AddDays(7), DateTime.UtcNow.AddDays(-31));

		token.IsSessionExpired(TimeSpan.FromDays(30)).ShouldBeTrue();
	}

	[Fact]
	[Trait("AC", "M1.4UC5")]
	public void IsSessionExpired_WhenSessionWithinAbsoluteLifetime_ReturnsFalse()
	{
		var token = CreateToken(DateTime.UtcNow.AddDays(7), DateTime.UtcNow.AddDays(-1));

		token.IsSessionExpired(TimeSpan.FromDays(30)).ShouldBeFalse();
	}
}