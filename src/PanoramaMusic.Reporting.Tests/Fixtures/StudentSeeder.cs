using Npgsql;

namespace PanoramaMusic.Reporting.Tests.Fixtures;

/// <summary>
/// Seeds rows directly against <see cref="ReportingDatabaseFixture"/>'s
/// connection, the same way <c>CourseFunctionTests</c> seeds through raw SQL
/// rather than the Students application layer — Reporting reads the
/// <c>students</c> schema directly, so its own tests seed it the same way.
/// </summary>
public static class StudentSeeder
{
	// Group · HalfHour · DuringSchool, from seed_lesson_structures.sql — reused
	// from CourseFunctionTests; any seeded structure works since #317 reads no
	// column of it.
	public static readonly Guid LessonStructureId = Guid.Parse("805c3cfd-7d2e-4376-b93b-4b4e2547f5e8");

	public static async Task<Guid> InsertStudentAsync(
		NpgsqlConnection connection,
		string firstName,
		string lastName,
		DateOnly dateOfBirth,
		string grade = "Grade4",
		string? studentClass = "A1",
		string? phase = "Junior",
		string language = "English")
	{
		var studentId = Guid.NewGuid();

		await using var command = connection.CreateCommand();
		command.CommandText = """
			INSERT INTO students.students (student_id, first_name, last_name, date_of_birth, grade, class, phase, language)
			VALUES (@student_id, @first_name, @last_name, @date_of_birth, @grade, @class, @phase, @language);
			""";
		command.Parameters.AddWithValue("student_id", studentId);
		command.Parameters.AddWithValue("first_name", firstName);
		command.Parameters.AddWithValue("last_name", lastName);
		command.Parameters.AddWithValue("date_of_birth", dateOfBirth);
		command.Parameters.AddWithValue("grade", grade);
		command.Parameters.AddWithValue("class", (object?)studentClass ?? DBNull.Value);
		command.Parameters.AddWithValue("phase", (object?)phase ?? DBNull.Value);
		command.Parameters.AddWithValue("language", language);

		await command.ExecuteNonQueryAsync();

		return studentId;
	}

	/// <summary>Links two students as siblings, inserting both directions as the schema requires.</summary>
	public static async Task LinkSiblingsAsync(NpgsqlConnection connection, Guid studentId, Guid siblingId)
	{
		await using var command = connection.CreateCommand();
		command.CommandText = """
			INSERT INTO students.siblings (student_id, sibling_id) VALUES (@a, @b), (@b, @a);
			""";
		command.Parameters.AddWithValue("a", studentId);
		command.Parameters.AddWithValue("b", siblingId);

		await command.ExecuteNonQueryAsync();
	}

	/// <summary>Puts a student on the waiting list with no enrolment, so <c>student_population</c> reads WaitingList.</summary>
	public static async Task InsertWaitingListOnlyAsync(NpgsqlConnection connection, Guid studentId)
	{
		await using var command = connection.CreateCommand();
		command.CommandText = """
			INSERT INTO students.waiting_list (waiting_list_entry_id, student_id, lesson_structure_id, instrument_type)
			VALUES (@entry_id, @student_id, @lesson_structure_id, 'Piano');
			""";
		command.Parameters.AddWithValue("entry_id", Guid.NewGuid());
		command.Parameters.AddWithValue("student_id", studentId);
		command.Parameters.AddWithValue("lesson_structure_id", LessonStructureId);

		await command.ExecuteNonQueryAsync();
	}
}