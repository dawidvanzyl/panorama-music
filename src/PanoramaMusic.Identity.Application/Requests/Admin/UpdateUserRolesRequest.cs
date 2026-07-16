using PanoramaMusic.Identity.Domain.Enums;

namespace PanoramaMusic.Identity.Application.Requests.Admin;

public sealed record UpdateUserRolesRequest(IList<Role> Roles);