namespace PanoramaMusic.Identity.Application.Models;

public sealed record CreateUserResult(Guid UserId, string InviteUrl);