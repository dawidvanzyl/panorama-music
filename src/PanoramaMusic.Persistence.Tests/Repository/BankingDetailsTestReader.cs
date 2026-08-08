using Npgsql;
using PanoramaMusic.Persistence.Tests.Models;

namespace PanoramaMusic.Persistence.Tests.Repository;

public sealed class BankingDetailsTestReader(string connectionString)
{
	public async Task<TestBankingDetailsRow?> FetchAsync(Guid teacherId, CancellationToken cancellationToken)
	{
		await using var connection = new NpgsqlConnection(connectionString);
		await connection.OpenAsync(cancellationToken);
		await using var command = connection.CreateCommand();
		command.CommandText = """
			SELECT teacher_id, bank, account_type, branch_code, account_number_protected, account_number_last4
			FROM teachers.banking_details
			WHERE teacher_id = @teacher_id;
			""";
		command.Parameters.AddWithValue("teacher_id", teacherId);

		await using var reader = await command.ExecuteReaderAsync(cancellationToken);

		return !await reader.ReadAsync(cancellationToken)
			? null
			: new TestBankingDetailsRow(
			reader.GetGuid(0),
			reader.GetString(1),
			reader.GetString(2),
			reader.GetString(3),
			reader.GetString(4),
			reader.GetString(5));
	}
}