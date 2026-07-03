namespace PanoramaMusic.Identity.Application.Commands.Admin;

public sealed record RevokeSessionCommand(Guid TokenId);