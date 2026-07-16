using PanoramaMusic.Identity.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Domain.Tests;

public class RefreshTokenTests
{
	[Fact]
	[Trait("AC", "M1UC7")]
	public void IsExpired_WhenExpiresAtInPast_ReturnsTrue()
	{
		var token = RefreshTokenFactory.Create(Guid.NewGuid(), Guid.NewGuid(), string.Empty, DateTime.UtcNow.AddMinutes(-1));

		token.IsExpired.ShouldBeTrue();
	}

	[Fact]
	[Trait("AC", "M1UC8")]
	public void IsRevoked_WhenRevokedAtSet_ReturnsTrue()
	{
		var token = RefreshTokenFactory.CreateRevoked(Guid.NewGuid(), Guid.NewGuid(), string.Empty, DateTime.UtcNow.AddHours(1));

		token.IsRevoked.ShouldBeTrue();
	}

	[Fact]
	[Trait("AC", "M1.4UC5")]
	public void IsSessionExpired_WhenSessionOlderThanAbsoluteLifetime_ReturnsTrue()
	{
		var token = RefreshTokenFactory.Create(Guid.NewGuid(), Guid.NewGuid(), string.Empty, DateTime.UtcNow.AddDays(7), DateTime.UtcNow.AddDays(-31));

		token.IsSessionExpired(TimeSpan.FromDays(30)).ShouldBeTrue();
	}

	[Fact]
	[Trait("AC", "M1.4UC5")]
	public void IsSessionExpired_WhenSessionWithinAbsoluteLifetime_ReturnsFalse()
	{
		var token = RefreshTokenFactory.Create(Guid.NewGuid(), Guid.NewGuid(), string.Empty, DateTime.UtcNow.AddDays(7), DateTime.UtcNow.AddDays(-1));

		token.IsSessionExpired(TimeSpan.FromDays(30)).ShouldBeFalse();
	}

	[Fact]
	[Trait("AC", "M1.4UC7")]
	public void LiveAccessTokenOrNull_WhenAccessTokenJtiAndFutureExpirySet_ReturnsMatchingRevokedAccessToken()
	{
		var tokenId = Guid.NewGuid();
		var jti = Guid.NewGuid();
		var expiresAt = DateTime.UtcNow.AddMinutes(10);
		var token = RefreshTokenFactory.Create(tokenId, Guid.NewGuid(), "hash", DateTime.UtcNow.AddDays(7), DateTime.UtcNow, accessTokenJti: jti, accessTokenExpiresAt: expiresAt);

		var result = token.LiveAccessTokenOrNull();

		result.ShouldNotBeNull();
		result.Jti.ShouldBe(jti);
		result.ExpiresAt.ShouldBe(expiresAt);
	}

	[Fact]
	[Trait("AC", "M1.4UC7")]
	public void LiveAccessTokenOrNull_WhenAccessTokenJtiNotSet_ReturnsNull()
	{
		var token = RefreshTokenFactory.Create(Guid.NewGuid(), Guid.NewGuid(), string.Empty, DateTime.UtcNow.AddDays(7));

		token.LiveAccessTokenOrNull().ShouldBeNull();
	}

	[Fact]
	[Trait("AC", "M1.4UC7")]
	public void LiveAccessTokenOrNull_WhenAccessTokenAlreadyExpired_ReturnsNull()
	{
		var tokenId = Guid.NewGuid();
		var token = RefreshTokenFactory.Create(tokenId, Guid.NewGuid(), "hash", DateTime.UtcNow.AddDays(7), DateTime.UtcNow, accessTokenJti: Guid.NewGuid(), accessTokenExpiresAt: DateTime.UtcNow.AddMinutes(-1));

		token.LiveAccessTokenOrNull().ShouldBeNull();
	}
}