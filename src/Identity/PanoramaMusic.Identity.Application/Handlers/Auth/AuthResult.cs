namespace PanoramaMusic.Identity.Application.Handlers.Auth;

public sealed record AuthResult(string AccessToken, string RefreshToken, DateTime ExpiresAt);
