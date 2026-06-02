namespace PanoramaMusic.Identity.Application.Handlers.Auth;

public sealed record LoginRequest(string Email, string Password);

public sealed record LoginCommand(LoginRequest Request);
