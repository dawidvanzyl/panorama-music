using PanoramaMusic.Identity.Domain.Enums;

namespace PanoramaMusic.Identity.Application.Models;

public sealed record UpdateUserRolesResult(Guid UserId, string Email, IList<Role> Roles, bool IsActive);