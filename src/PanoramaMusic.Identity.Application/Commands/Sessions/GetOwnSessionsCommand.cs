namespace PanoramaMusic.Identity.Application.Commands.Sessions;

public sealed record GetOwnSessionsCommand(string? CurrentRefreshToken);