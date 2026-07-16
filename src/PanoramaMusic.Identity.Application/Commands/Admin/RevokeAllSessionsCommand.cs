namespace PanoramaMusic.Identity.Application.Commands.Admin;

public sealed record RevokeAllSessionsCommand(string? CurrentRefreshToken);