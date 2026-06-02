namespace PanoramaMusic.Identity.Application.Handlers.Auth;

public sealed record RefreshTokenRequest(string Token);

public sealed record RefreshTokenCommand(RefreshTokenRequest Request);
