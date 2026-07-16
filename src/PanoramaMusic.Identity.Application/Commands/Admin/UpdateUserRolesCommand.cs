using PanoramaMusic.Identity.Application.Requests.Admin;

namespace PanoramaMusic.Identity.Application.Commands.Admin;

public sealed record UpdateUserRolesCommand(Guid UserId, UpdateUserRolesRequest Request);