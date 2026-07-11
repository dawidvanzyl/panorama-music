namespace PanoramaMusic.Identity.Domain.Entities;

public sealed record RevokedAccessToken(Guid Jti, DateTime ExpiresAt);