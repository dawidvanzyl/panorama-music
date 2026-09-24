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

	// Individual · Hour · DuringSchool and Individual · HalfHour · DuringSchool,
	// from seed_lesson_structures.sql — the two structures Instrument courses go
	// on in this suite.
	public static readonly Guid InstrumentHourLessonStructureId = Guid.Parse("e9ac58cc-d6a5-406e-b6a2-55076a0a3565");
	public static readonly Guid InstrumentHalfHourLessonStructureId = Guid.Parse("0e6ecae2-b60a-483d-8abd-907a94e6a364");

	// Group · Hour · DuringSchool, from seed_lesson_structures.sql — the
	// structure Theory courses go on in this suite.
	public static readonly Guid TheoryLessonStructureId = Guid.Parse("a208d954-2181-447f-af20-53ba2ca49ebf");

	// Father, from seed_guardian_relationships.sql.
	public static readonly Guid FatherRelationshipId = Guid.Parse("e7cdd671-b118-49b3-bb39-beaac8124ab1");

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

	public static async Task<Guid> InsertGuardianAsync(
		NpgsqlConnection connection,
		Guid studentId,
		string firstName,
		string surname,
		Guid guardianRelationshipId,
		string? cell = null,
		string? email = null,
		bool receivesCorrespondence = false,
		bool responsibleForPayment = false,
		bool married = false)
	{
		var guardianId = Guid.NewGuid();

		await using var insertGuardian = connection.CreateCommand();
		insertGuardian.CommandText = """
			INSERT INTO students.guardians
			    (guardian_id, guardian_relationship_id, first_name, surname, cell, email,
			     receives_correspondence, responsible_for_payment, married)
			VALUES (@guardian_id, @guardian_relationship_id, @first_name, @surname, @cell, @email,
			        @receives_correspondence, @responsible_for_payment, @married);
			""";
		insertGuardian.Parameters.AddWithValue("guardian_id", guardianId);
		insertGuardian.Parameters.AddWithValue("guardian_relationship_id", guardianRelationshipId);
		insertGuardian.Parameters.AddWithValue("first_name", firstName);
		insertGuardian.Parameters.AddWithValue("surname", surname);
		insertGuardian.Parameters.AddWithValue("cell", (object?)cell ?? DBNull.Value);
		insertGuardian.Parameters.AddWithValue("email", (object?)email ?? DBNull.Value);
		insertGuardian.Parameters.AddWithValue("receives_correspondence", receivesCorrespondence);
		insertGuardian.Parameters.AddWithValue("responsible_for_payment", responsibleForPayment);
		insertGuardian.Parameters.AddWithValue("married", married);
		await insertGuardian.ExecuteNonQueryAsync();

		await using var link = connection.CreateCommand();
		link.CommandText = "INSERT INTO students.student_guardians (student_id, guardian_id) VALUES (@student_id, @guardian_id);";
		link.Parameters.AddWithValue("student_id", studentId);
		link.Parameters.AddWithValue("guardian_id", guardianId);
		await link.ExecuteNonQueryAsync();

		return guardianId;
	}

	public static async Task<Guid> InsertCourseAsync(NpgsqlConnection connection, string courseType, Guid lessonStructureId)
	{
		var courseId = Guid.NewGuid();

		await using var command = connection.CreateCommand();
		command.CommandText = """
			INSERT INTO students.courses (course_id, course_type, cost, lesson_structure_id)
			VALUES (@course_id, @course_type, @cost, @lesson_structure_id);
			""";
		command.Parameters.AddWithValue("course_id", courseId);
		command.Parameters.AddWithValue("course_type", courseType);
		command.Parameters.AddWithValue("cost", 100.00m);
		command.Parameters.AddWithValue("lesson_structure_id", lessonStructureId);
		await command.ExecuteNonQueryAsync();

		return courseId;
	}

	public static async Task<Guid> InsertTeacherAsync(
		NpgsqlConnection connection, string firstName, string surname, bool isActive = true, bool isPrivate = false)
	{
		var teacherId = Guid.NewGuid();

		await using var command = connection.CreateCommand();
		command.CommandText = """
			INSERT INTO teachers.teachers (teacher_id, first_name, surname, is_private, is_active)
			VALUES (@teacher_id, @first_name, @surname, @is_private, @is_active);
			""";
		command.Parameters.AddWithValue("teacher_id", teacherId);
		command.Parameters.AddWithValue("first_name", firstName);
		command.Parameters.AddWithValue("surname", surname);
		command.Parameters.AddWithValue("is_private", isPrivate);
		command.Parameters.AddWithValue("is_active", isActive);
		await command.ExecuteNonQueryAsync();

		return teacherId;
	}

	public static async Task<Guid> InsertStudentCourseAsync(
		NpgsqlConnection connection,
		Guid studentId,
		Guid courseId,
		Guid teacherId,
		DateOnly? enrolledDate = null)
	{
		var studentCourseId = Guid.NewGuid();

		await using var command = connection.CreateCommand();
		command.CommandText = """
			INSERT INTO students.student_courses (student_course_id, student_id, course_id, teacher_id, enrolled_date)
			VALUES (@student_course_id, @student_id, @course_id, @teacher_id, @enrolled_date);
			""";
		command.Parameters.AddWithValue("student_course_id", studentCourseId);
		command.Parameters.AddWithValue("student_id", studentId);
		command.Parameters.AddWithValue("course_id", courseId);
		command.Parameters.AddWithValue("teacher_id", teacherId);
		command.Parameters.AddWithValue("enrolled_date", enrolledDate ?? DateOnly.FromDateTime(DateTime.UtcNow));
		await command.ExecuteNonQueryAsync();

		return studentCourseId;
	}

	public static async Task InsertStudentInstrumentAsync(
		NpgsqlConnection connection, Guid studentCourseId, string? instrumentType, string stepType)
	{
		await using var command = connection.CreateCommand();
		command.CommandText = """
			INSERT INTO students.student_instruments (student_course_id, instrument_type, step_type)
			VALUES (@student_course_id, @instrument_type, @step_type);
			""";
		command.Parameters.AddWithValue("student_course_id", studentCourseId);
		command.Parameters.AddWithValue("instrument_type", (object?)instrumentType ?? DBNull.Value);
		command.Parameters.AddWithValue("step_type", stepType);
		await command.ExecuteNonQueryAsync();
	}

	public static async Task<Guid> InsertExtraCurricularAsync(NpgsqlConnection connection, string description, string phase)
	{
		var extraCurricularId = Guid.NewGuid();

		await using var command = connection.CreateCommand();
		command.CommandText = """
			INSERT INTO students.extra_curriculars (extra_curricular_id, description, phase)
			VALUES (@extra_curricular_id, @description, @phase);
			""";
		command.Parameters.AddWithValue("extra_curricular_id", extraCurricularId);
		command.Parameters.AddWithValue("description", description);
		command.Parameters.AddWithValue("phase", phase);
		await command.ExecuteNonQueryAsync();

		return extraCurricularId;
	}

	public static async Task InsertPracticeTimeAsync(
		NpgsqlConnection connection, Guid extraCurricularId, string day, TimeOnly startTime)
	{
		await using var command = connection.CreateCommand();
		command.CommandText = """
			INSERT INTO students.extra_curricular_practice_times (practice_time_id, extra_curricular_id, day, start_time)
			VALUES (@practice_time_id, @extra_curricular_id, @day, @start_time);
			""";
		command.Parameters.AddWithValue("practice_time_id", Guid.NewGuid());
		command.Parameters.AddWithValue("extra_curricular_id", extraCurricularId);
		command.Parameters.AddWithValue("day", day);
		command.Parameters.AddWithValue("start_time", startTime.ToTimeSpan());
		await command.ExecuteNonQueryAsync();
	}

	public static async Task AssignExtraCurricularAsync(NpgsqlConnection connection, Guid studentId, Guid extraCurricularId)
	{
		await using var command = connection.CreateCommand();
		command.CommandText = """
			INSERT INTO students.student_extra_curriculars (student_id, extra_curricular_id)
			VALUES (@student_id, @extra_curricular_id);
			""";
		command.Parameters.AddWithValue("student_id", studentId);
		command.Parameters.AddWithValue("extra_curricular_id", extraCurricularId);
		await command.ExecuteNonQueryAsync();
	}
}