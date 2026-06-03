namespace PanoramaMusic.Identity.Domain.Entities;

public sealed record JwtToken(string Token, DateTime ExpiresAt);