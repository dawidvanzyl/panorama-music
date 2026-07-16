namespace PanoramaMusic.Identity.Infrastructure.Dtos;

/// <summary>
/// Mirrors the identity.revoked_access_token_input composite type, mapped via
/// NpgsqlDataSourceBuilder.MapComposite in ServiceCollectionExtensions.ConfigureCompositeTypes.
/// Npgsql's default composite name translator maps PascalCase properties to the
/// composite's snake_case attributes (Jti -> jti, ExpiresAt -> expires_at).
/// </summary>
internal sealed record RevokedAccessTokenInputDto(Guid Jti, DateTime ExpiresAt);