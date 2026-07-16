using Npgsql;

namespace PanoramaMusic.Persistence.Tests.Repository;

public sealed class RevokedAccessTokenTestReader(string connectionString)
{
	public async Task<DateTime?> FetchExpiresAtAsync(Guid jti, CancellationToken cancellationToken)
	{
		await using var connection = new NpgsqlConnection(connectionString);
		await connection.OpenAsync(cancellationToken);
		await using var command = connection.CreateCommand();
		command.CommandText = "SELECT expires_at FROM identity.revoked_access_tokens WHERE jti = @jti;";
		command.Parameters.AddWithValue("jti", jti);

		var result = await command.ExecuteScalarAsync(cancellationToken);
		return result is null or DBNull ? null : DateTime.SpecifyKind((DateTime)result, DateTimeKind.Utc);
	}
}