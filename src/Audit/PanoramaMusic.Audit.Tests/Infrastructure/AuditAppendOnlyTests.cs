using Npgsql;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Audit.Tests.Infrastructure;

public class AuditAppendOnlyTests(AuditDatabaseFixture fixture) : IClassFixture<AuditDatabaseFixture>
{
	[Fact]
	[Trait("AC", "M1.5UC10")]
	public async Task GivenApplicationRole_WhenUpdatingOrDeletingAuditEvent_ThenDatabaseRejectsOperation()
	{
		// Arrange — insert a row as the application role via the insert function
		// (INSERT is permitted), so there is something to attempt UPDATE/DELETE on.
		var eventId = Guid.NewGuid();
		await using var connection = new NpgsqlConnection(fixture.ApplicationConnectionString);
		await connection.OpenAsync(TestContext.Current.CancellationToken);

		await using (var insert = connection.CreateCommand())
		{
			insert.CommandText = """
                SELECT audit.create_audit_event(
                    @id, now(), 'identity.session.login_succeeded',
                    NULL, NULL, NULL, '127.0.0.1', 'xunit', @correlation_id,
                    'success', NULL, '{}');
                """;
			insert.Parameters.AddWithValue("id", eventId);
			insert.Parameters.AddWithValue("correlation_id", Guid.NewGuid());
			await insert.ExecuteNonQueryAsync(TestContext.Current.CancellationToken);
		}

		// Act & Assert — UPDATE is rejected with insufficient_privilege.
		await using (var update = connection.CreateCommand())
		{
			update.CommandText = "UPDATE audit.audit_events SET outcome = 'failure' WHERE id = @id;";
			update.Parameters.AddWithValue("id", eventId);
			var updateException = await Should.ThrowAsync<PostgresException>(
				() => update.ExecuteNonQueryAsync(TestContext.Current.CancellationToken));
			updateException.SqlState.ShouldBe(PostgresErrorCodes.InsufficientPrivilege);
		}

		// Act & Assert — DELETE is rejected with insufficient_privilege.
		await using (var delete = connection.CreateCommand())
		{
			delete.CommandText = "DELETE FROM audit.audit_events WHERE id = @id;";
			delete.Parameters.AddWithValue("id", eventId);
			var deleteException = await Should.ThrowAsync<PostgresException>(
				() => delete.ExecuteNonQueryAsync(TestContext.Current.CancellationToken));
			deleteException.SqlState.ShouldBe(PostgresErrorCodes.InsufficientPrivilege);
		}

		// SELECT remains permitted — the row is still there and readable.
		await using (var select = connection.CreateCommand())
		{
			select.CommandText = "SELECT outcome FROM audit.audit_events WHERE id = @id;";
			select.Parameters.AddWithValue("id", eventId);
			var outcome = await select.ExecuteScalarAsync(TestContext.Current.CancellationToken);
			outcome.ShouldBe("success");
		}
	}
}