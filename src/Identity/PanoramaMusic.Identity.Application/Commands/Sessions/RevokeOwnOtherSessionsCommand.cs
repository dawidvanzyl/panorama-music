namespace PanoramaMusic.Identity.Application.Commands.Sessions;

public sealed record RevokeOwnOtherSessionsCommand(string? CurrentRefreshToken);