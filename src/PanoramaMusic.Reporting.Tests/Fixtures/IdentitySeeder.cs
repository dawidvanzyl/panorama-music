using Npgsql;

namespace PanoramaMusic.Reporting.Tests.Fixtures;

/// <summary>
/// Seeds <c>identity.users</c> rows directly by SQL — Reporting's saved-report
/// list reads the creator's email through a cross-schema join, so its tests
/// need a row there without pulling in the Identity application layer.
/// </summary>
public static class IdentitySeeder
{
	public static async Task<Guid> InsertUserAsync(NpgsqlConnection connection, string email)
	{
		var userId = Guid.NewGuid();

		await using var command = connection.CreateCommand();
		command.CommandText = """
			INSERT INTO identity.users (user_id, email, is_active)
			VALUES (@user_id, @email, TRUE);
			""";
		command.Parameters.AddWithValue("user_id", userId);
		command.Parameters.AddWithValue("email", email);
		await command.ExecuteNonQueryAsync();

		return userId;
	}
}
