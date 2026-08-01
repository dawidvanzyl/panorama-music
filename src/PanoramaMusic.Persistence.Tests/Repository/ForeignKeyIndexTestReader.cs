using Npgsql;

namespace PanoramaMusic.Persistence.Tests.Repository;

/// <summary>
/// Derives the foreign-key and index catalogues directly from Postgres system
/// tables, so the guard test needs no edit as tables are added. A foreign-key
/// column counts as covered only when it is the leading (first) column of an
/// index — the only case Postgres can use for a single-column lookup.
/// </summary>
public sealed class ForeignKeyIndexTestReader(string connectionString, string ddlConnectionString)
{
	private const string _unindexedForeignKeyColumnsSql = """
		WITH fk_columns AS (
		    SELECT
		        con.conrelid AS table_oid,
		        rel.relname AS table_name,
		        att.attname AS column_name
		    FROM pg_constraint con
		    JOIN pg_class rel ON rel.oid = con.conrelid
		    JOIN pg_attribute att
		        ON att.attrelid = con.conrelid AND att.attnum = con.conkey[1]
		    WHERE con.contype = 'f'
		      AND con.connamespace = @schema::regnamespace
		),
		leading_index_columns AS (
		    SELECT
		        idx.indrelid AS table_oid,
		        att.attname AS column_name
		    FROM pg_index idx
		    JOIN pg_attribute att
		        ON att.attrelid = idx.indrelid AND att.attnum = idx.indkey[0]
		)
		SELECT fk.table_name, fk.column_name
		FROM fk_columns fk
		LEFT JOIN leading_index_columns lic
		    ON lic.table_oid = fk.table_oid AND lic.column_name = fk.column_name
		WHERE lic.column_name IS NULL
		ORDER BY fk.table_name, fk.column_name;
		""";

	public async Task<IReadOnlyList<(string Table, string Column)>> FindUnindexedForeignKeyColumnsAsync(
		string schema, CancellationToken cancellationToken)
	{
		await using var connection = new NpgsqlConnection(connectionString);
		await connection.OpenAsync(cancellationToken);
		await using var command = connection.CreateCommand();
		command.CommandText = _unindexedForeignKeyColumnsSql;
		command.Parameters.AddWithValue("schema", schema);

		var results = new List<(string, string)>();
		await using var reader = await command.ExecuteReaderAsync(cancellationToken);
		while (await reader.ReadAsync(cancellationToken))
			results.Add((reader.GetString(0), reader.GetString(1)));

		return results;
	}

	public async Task ExecuteAsync(string sql, CancellationToken cancellationToken)
	{
		await using var connection = new NpgsqlConnection(ddlConnectionString);
		await connection.OpenAsync(cancellationToken);
		await using var command = connection.CreateCommand();
		command.CommandText = sql;
		await command.ExecuteNonQueryAsync(cancellationToken);
	}
}