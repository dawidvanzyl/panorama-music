namespace PanoramaMusic.Identity.Application.Commands.Sessions;

public sealed record RevokeOwnSessionCommand(Guid TokenId, string? CurrentRefreshToken);