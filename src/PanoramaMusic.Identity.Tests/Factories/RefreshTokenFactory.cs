using PanoramaMusic.Identity.Domain.Entities;

namespace PanoramaMusic.Identity.Tests.Factories;

public static class RefreshTokenFactory
{
	public static RefreshToken CreateRevoked(Guid tokenId, Guid userId, string tokenHash, DateTime? expiresAt = null, DateTime? sessionStartedAt = null, Guid? familyId = null)
	{
		var token = Create(tokenId, userId, tokenHash, expiresAt, sessionStartedAt, familyId);
		token.Revoke();
		return token;
	}

	public static RefreshToken Create(
		Guid tokenId,
		Guid userId,
		string tokenHash,
		DateTime? expiresAt = null,
		DateTime? sessionStartedAt = null,
		Guid? familyId = null,
		Guid? accessTokenJti = null,
		DateTime? accessTokenExpiresAt = null)
	{
		return new RefreshToken(
			tokenId,
			userId,
			tokenHash,
			expiresAt ?? DateTime.UtcNow.AddDays(7),
			familyId ?? tokenId,
			sessionStartedAt ?? DateTime.UtcNow,
			null,
			null,
			accessTokenJti,
			accessTokenExpiresAt);
	}
}