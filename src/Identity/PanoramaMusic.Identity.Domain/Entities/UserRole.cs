using PanoramaMusic.Identity.Domain.Common;

namespace PanoramaMusic.Identity.Domain.Entities;

public record UserRole(Guid UserId, Role Role);
