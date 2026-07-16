using Npgsql;
using PanoramaMusic.Persistence.Tests.Models;

namespace PanoramaMusic.Persistence.Tests.Repository;

public sealed class IdentityAuditTrailTestReader(string connectionString)
{
	public async Task<AuditEventRow?> FetchByTargetAsync(string eventType, Guid targetId, CancellationToken cancellationToken) =>
		await QuerySingleAsync(
			"SELECT * FROM audit.audit_events WHERE event_type = @event_type AND target_id = @target_id ORDER BY occurred_at DESC LIMIT 1;",
			command =>
			{
				command.Parameters.AddWithValue("event_type", eventType);
				command.Parameters.AddWithValue("target_id", targetId);
			},
			cancellationToken);

	public async Task<AuditEventRow?> FetchByActorAsync(string eventType, Guid actorId, CancellationToken cancellationToken) =>
		await QuerySingleAsync(
			"SELECT * FROM audit.audit_events WHERE event_type = @event_type AND actor_id = @actor_id ORDER BY occurred_at DESC LIMIT 1;",
			command =>
			{
				command.Parameters.AddWithValue("event_type", eventType);
				command.Parameters.AddWithValue("actor_id", actorId);
			},
			cancellationToken);

	public async Task<AuditEventRow?> FetchLatestByDetailContainsAsync(string eventType, string detailFragment, CancellationToken cancellationToken) =>
		await QuerySingleAsync(
			"SELECT * FROM audit.audit_events WHERE event_type = @event_type AND detail::text LIKE @fragment ORDER BY occurred_at DESC LIMIT 1;",
			command =>
			{
				command.Parameters.AddWithValue("event_type", eventType);
				command.Parameters.AddWithValue("fragment", $"%{detailFragment}%");
			},
			cancellationToken);

	public async Task<long> CountByTargetAsync(string eventType, Guid targetId, CancellationToken cancellationToken)
	{
		await using var connection = new NpgsqlConnection(connectionString);
		await connection.OpenAsync(cancellationToken);
		await using var command = connection.CreateCommand();
		command.CommandText = "SELECT count(*) FROM audit.audit_events WHERE event_type = @event_type AND target_id = @target_id;";
		command.Parameters.AddWithValue("event_type", eventType);
		command.Parameters.AddWithValue("target_id", targetId);
		return (long)(await command.ExecuteScalarAsync(cancellationToken))!;
	}

	public async Task<long> CountAsync(string table, string idColumn, Guid id, CancellationToken cancellationToken)
	{
		await using var connection = new NpgsqlConnection(connectionString);
		await connection.OpenAsync(cancellationToken);
		await using var command = connection.CreateCommand();
		command.CommandText = $"SELECT count(*) FROM {table} WHERE {idColumn} = @id;";
		command.Parameters.AddWithValue("id", id);
		return (long)(await command.ExecuteScalarAsync(cancellationToken))!;
	}

	private async Task<AuditEventRow?> QuerySingleAsync(string sql, Action<NpgsqlCommand> configure, CancellationToken cancellationToken)
	{
		await using var connection = new NpgsqlConnection(connectionString);
		await connection.OpenAsync(cancellationToken);
		await using var command = connection.CreateCommand();
		command.CommandText = sql;
		configure(command);
		await using var reader = await command.ExecuteReaderAsync(cancellationToken);
		if (!await reader.ReadAsync(cancellationToken))
			return null;

		var detail = reader.GetString(reader.GetOrdinal("detail"));
		return new AuditEventRow(
			reader.GetDateTime(reader.GetOrdinal("occurred_at")),
			reader.GetString(reader.GetOrdinal("event_type")),
			reader.IsDBNull(reader.GetOrdinal("actor_id")) ? null : reader.GetGuid(reader.GetOrdinal("actor_id")),
			reader.IsDBNull(reader.GetOrdinal("actor_email")) ? null : reader.GetString(reader.GetOrdinal("actor_email")),
			reader.IsDBNull(reader.GetOrdinal("target_id")) ? null : reader.GetGuid(reader.GetOrdinal("target_id")),
			reader.GetString(reader.GetOrdinal("source_ip")),
			reader.GetString(reader.GetOrdinal("user_agent")),
			reader.GetGuid(reader.GetOrdinal("correlation_id")),
			reader.GetString(reader.GetOrdinal("outcome")),
			reader.IsDBNull(reader.GetOrdinal("reason")) ? null : reader.GetString(reader.GetOrdinal("reason")),
			detail,
			BuildRawRow(reader));
	}

	private string BuildRawRow(NpgsqlDataReader reader)
	{
		var values = new object[reader.FieldCount];
		reader.GetValues(values);
		return string.Join('|', values.Select(v => v?.ToString() ?? string.Empty));
	}
}