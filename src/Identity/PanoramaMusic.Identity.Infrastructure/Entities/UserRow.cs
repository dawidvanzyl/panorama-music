namespace PanoramaMusic.Identity.Infrastructure.Entities;

internal sealed record UserRow(
    Guid user_id,
    string email,
    string? password_hash,
    bool is_active,
    DateTime created_at);
