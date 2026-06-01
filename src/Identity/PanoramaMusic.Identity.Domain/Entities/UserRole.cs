using PanoramaMusic.Identity.Domain.Enums;

namespace PanoramaMusic.Identity.Domain.Entities;

public record UserRole(Guid UserId, Role Role);
