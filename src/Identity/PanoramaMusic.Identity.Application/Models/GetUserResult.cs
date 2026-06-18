using PanoramaMusic.Identity.Domain.Enums;

namespace PanoramaMusic.Identity.Application.Models;

public sealed record GetUserResult(Guid UserId, string Email, IList<Role> Roles, bool IsActive, bool IsProtected);