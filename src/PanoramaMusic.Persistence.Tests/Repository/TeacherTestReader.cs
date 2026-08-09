using Npgsql;
using PanoramaMusic.Persistence.Tests.Models;

namespace PanoramaMusic.Persistence.Tests.Repository;

public sealed class TeacherTestReader(string connectionString)
{
	public async Task<TestTeacherRow?> FetchAsync(Guid teacherId, CancellationToken cancellationToken)
	{
		await using var connection = new NpgsqlConnection(connectionString);
		await connection.OpenAsync(cancellationToken);
		await using var command = connection.CreateCommand();
		command.CommandText = """
			SELECT teacher_id, first_name, surname, is_active
			FROM teachers.teachers
			WHERE teacher_id = @teacher_id;
			""";
		command.Parameters.AddWithValue("teacher_id", teacherId);

		await using var reader = await command.ExecuteReaderAsync(cancellationToken);

		return !await reader.ReadAsync(cancellationToken)
			? null
			: new TestTeacherRow(
				reader.GetGuid(0),
				reader.GetString(1),
				reader.GetString(2),
				reader.GetBoolean(3));
	}
}