using Npgsql;
using PanoramaMusic.Persistence;
using PanoramaMusic.Students.Infrastructure.Persistence;
using Testcontainers.PostgreSql;
using Xunit;

namespace PanoramaMusic.Students.Tests.Fixtures;

/// <summary>
/// Starts a disposable Postgres, provisions the restricted panorama_app role,
/// and runs the Students context migrations — mirroring what InitializeDatabase
/// does at application startup.
/// </summary>
public sealed class StudentsDatabaseFixture : IAsyncLifetime
{
	private readonly PostgreSqlContainer _postgres;
	private string _migrationConnectionString = null!;

	public StudentsDatabaseFixture()
	{
		_postgres = new PostgreSqlBuilder("postgres:16")
			.Build();
	}

	public NpgsqlConnection Connection { get; private set; } = null!;

	public async ValueTask InitializeAsync()
	{
		// The repositories call Postgres functions via CommandType.StoredProcedure,
		// which Npgsql emits as CALL unless this compatibility switch is on — the
		// same one Program.cs sets at application startup. Only tests that drive a
		// repository directly need it; the raw SQL below would work either way.
		AppContext.SetSwitch("Npgsql.EnableStoredProcedureCompatMode", true);

		await _postgres.StartAsync();

		_migrationConnectionString = _postgres.GetConnectionString();
		var applicationConnectionString = new NpgsqlConnectionStringBuilder(_migrationConnectionString)
		{
			Username = DatabaseMigrator.ApplicationRoleName,
			Password = "panorama_app_test",
		}.ConnectionString;

		DatabaseMigrator.EnsureApplicationRole(_migrationConnectionString, applicationConnectionString);
		StudentMigrator.Run(_migrationConnectionString);

		Connection = new NpgsqlConnection(applicationConnectionString);
		await Connection.OpenAsync();
	}

	/// <summary>
	/// Re-runs the Students context migrator (schema → functions → seeds) against
	/// the same database, simulating a subsequent deploy's RunAlways seed pass.
	/// </summary>
	public void RerunMigrations() => StudentMigrator.Run(_migrationConnectionString);

	/// <summary>
	/// The course for a type and structure, created when none exists yet. A course
	/// type and a structure identify one course, so tests that need a course on a
	/// pair another test already used share it instead of inserting a second.
	/// </summary>
	public async Task<Guid> EnsureCourseAsync(string courseType, Guid lessonStructureId)
	{
		await using var command = Connection.CreateCommand();
		command.CommandText =
			"""
			WITH inserted AS (
			    INSERT INTO students.courses (course_id, course_type, cost, lesson_structure_id)
			    VALUES (@p_course_id, @p_course_type, 450.00, @p_lesson_structure_id)
			    ON CONFLICT (course_type, lesson_structure_id) DO NOTHING
			    RETURNING course_id)
			SELECT course_id FROM inserted
			UNION ALL
			SELECT course_id FROM students.courses
			WHERE course_type = @p_course_type AND lesson_structure_id = @p_lesson_structure_id
			LIMIT 1;
			""";
		command.Parameters.Add(new NpgsqlParameter("p_course_id", Guid.NewGuid()));
		command.Parameters.Add(new NpgsqlParameter("p_course_type", courseType));
		command.Parameters.Add(new NpgsqlParameter("p_lesson_structure_id", lessonStructureId));

		return (Guid)(await command.ExecuteScalarAsync(TestContext.Current.CancellationToken))!;
	}

	public async ValueTask DisposeAsync()
	{
		await Connection.CloseAsync();
		Connection.Dispose();
		await _postgres.DisposeAsync();
	}
}