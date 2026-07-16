using Npgsql;
using PanoramaMusic.Audit.Tests.Fixtures;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Audit.Tests.Infrastructure;

public class AuditEventGrantsTests : IClassFixture<AuditDatabaseFixture>
{
	private readonly AuditDatabaseFixture _fixture;

	public AuditEventGrantsTests(AuditDatabaseFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	[Trait("AC", "M1.5UC10")]
	public async Task GivenApplicationRole_WhenInsertingAndSelectingAuditEvent_ThenDatabaseAcceptsOperation()
	{
		// Act & Assert - SELECT remains permitted — the row is still there and readable.
		await using (var select = _fixture.Connection.CreateCommand())
		{
			select.CommandText = "SELECT outcome FROM audit.audit_events WHERE id = @id;";
			select.Parameters.AddWithValue("id", _fixture.EventId);
			var outcome = await select.ExecuteScalarAsync(TestContext.Current.CancellationToken);
			outcome.ShouldBe("success");
		}
	}

	[Fact]
	[Trait("AC", "M1.5UC10")]
	public async Task GivenApplicationRole_WhenUpdatingAuditEvent_ThenDatabaseRejectsOperation()
	{
		// Act & Assert — UPDATE is rejected with insufficient_privilege.
		await using (var update = _fixture.Connection.CreateCommand())
		{
			update.CommandText = "UPDATE audit.audit_events SET outcome = 'failure' WHERE id = @id;";
			update.Parameters.AddWithValue("id", _fixture.EventId);
			var updateException = await Should.ThrowAsync<PostgresException>(
				() => update.ExecuteNonQueryAsync(TestContext.Current.CancellationToken));
			updateException.SqlState.ShouldBe(PostgresErrorCodes.InsufficientPrivilege);
		}
	}

	[Fact]
	[Trait("AC", "M1.5UC10")]
	public async Task GivenApplicationRole_WhenDeletingAuditEvent_ThenDatabaseRejectsOperation()
	{
		// Act & Assert — DELETE is rejected with insufficient_privilege.
		await using (var delete = _fixture.Connection.CreateCommand())
		{
			delete.CommandText = "DELETE FROM audit.audit_events WHERE id = @id;";
			delete.Parameters.AddWithValue("id", _fixture.EventId);
			var deleteException = await Should.ThrowAsync<PostgresException>(
				() => delete.ExecuteNonQueryAsync(TestContext.Current.CancellationToken));
			deleteException.SqlState.ShouldBe(PostgresErrorCodes.InsufficientPrivilege);
		}
	}
}