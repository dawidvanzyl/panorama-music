namespace PanoramaMusic.Identity.Infrastructure.Entities;

internal sealed record InviteTokenRow(
    Guid token_id,
    Guid user_id,
    string token_hash,
    DateTime expires_at,
    DateTime? used_at);
