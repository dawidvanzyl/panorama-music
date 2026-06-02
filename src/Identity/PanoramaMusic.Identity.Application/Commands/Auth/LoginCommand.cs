using PanoramaMusic.Identity.Application.Requests.Auth;

namespace PanoramaMusic.Identity.Application.Commands.Auth;

public sealed record LoginCommand(LoginRequest Request);
