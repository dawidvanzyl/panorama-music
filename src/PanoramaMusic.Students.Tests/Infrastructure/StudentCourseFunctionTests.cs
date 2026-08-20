using Npgsql;
using PanoramaMusic.Students.Tests.Fixtures;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Infrastructure;

/// <summary>
/// What the enrollment write functions actually leave behind in the database.
/// The handler tests assert the calls a use case makes; these assert that those
/// calls do what their names claim against real Postgres — in particular that
/// the instrument and step recorded against an enrollment are removed with it,
/// which no application code does explicitly and which only the cascade on
/// student_instruments delivers.
/// </summary>
public class StudentCourseFunctionTests : IClassFixture<StudentsDatabaseFixture>
{
	private readonly StudentsDatabaseFixture _fixture;

	public StudentCourseFunctionTests(StudentsDatabaseFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	[Trait("AC", "269UC7")]
	public async Task DeleteStudentCourse_EnrollmentRecordingAnInstrumentAndStep_RemovesBothWithIt()
	{
		var studentId = await GivenStudentAsync();
		var courseId = await GivenCourseAsync("Instrument");
		var enrollmentId = await GivenEnrollmentAsync(studentId, courseId, "Piano", "Step2A");

		await CallAsync(
			"SELECT students.delete_student_course(@p_student_course_id);",
			("p_student_course_id", enrollmentId));

		var enrollments = await CountEnrollmentsAsync(enrollmentId);
		var instruments = await CountInstrumentsAsync(enrollmentId);

		ShouldlyHelpers.Satisfy(
			() => enrollments.ShouldBe(0),
			() => instruments.ShouldBe(0));
	}

	[Fact]
	[Trait("AC", "269UC7")]
	public async Task DeleteStudentCourse_StudentHoldingAnotherEnrollment_LeavesTheOtherAndItsInstrumentIntact()
	{
		var studentId = await GivenStudentAsync();
		var withdrawnId = await GivenEnrollmentAsync(
			studentId, await GivenCourseAsync("Instrument"), "Piano", "Step2A");
		var keptId = await GivenEnrollmentAsync(
			studentId, await GivenCourseAsync("Theory"), instrumentType: null, "Step4B");

		await CallAsync(
			"SELECT students.delete_student_course(@p_student_course_id);",
			("p_student_course_id", withdrawnId));

		var keptEnrollments = await CountEnrollmentsAsync(keptId);
		var keptInstruments = await CountInstrumentsAsync(keptId);

		ShouldlyHelpers.Satisfy(
			() => keptEnrollments.ShouldBe(1),
			() => keptInstruments.ShouldBe(1));
	}

	[Fact]
	[Trait("AC", "269UC1")]
	public async Task UpdateStudentCourse_CorrectedTeacherAndInstrument_ReplacesBothWithNothingStaleLeft()
	{
		var studentId = await GivenStudentAsync();
		var enrollmentId = await GivenEnrollmentAsync(
			studentId, await GivenCourseAsync("Instrument"), "Piano", "Step2A");
		var newTeacherId = Guid.NewGuid();

		// The two writes the repository's update makes, in the order it makes
		// them: the enrollment itself, then the instrument row replaced outright.
		await CallAsync(
			"SELECT students.update_student_course(@p_student_course_id, @p_teacher_id);",
			("p_student_course_id", enrollmentId),
			("p_teacher_id", newTeacherId));
		await CallAsync(
			"SELECT students.delete_student_instrument(@p_student_course_id);",
			("p_student_course_id", enrollmentId));
		await CallAsync(
			"SELECT students.create_student_instrument(@p_student_course_id, @p_instrument_type, @p_step_type);",
			("p_student_course_id", enrollmentId),
			("p_instrument_type", "Guitar"),
			("p_step_type", "Step3B"));

		var (teacherId, instrumentType, stepType) = await ReadEnrollmentAsync(enrollmentId);
		var instruments = await CountInstrumentsAsync(enrollmentId);

		ShouldlyHelpers.Satisfy(
			() => teacherId.ShouldBe(newTeacherId),
			() => instrumentType.ShouldBe("Guitar"),
			() => stepType.ShouldBe("Step3B"),
			// One row, not the old one alongside the new.
			() => instruments.ShouldBe(1));
	}

	[Fact]
	[Trait("AC", "269UC1")]
	public async Task DeleteStudentInstrument_EnrollmentRecordingNeither_LeavesTheEnrollmentItself()
	{
		var studentId = await GivenStudentAsync();
		var enrollmentId = await GivenEnrollmentAsync(
			studentId, await GivenCourseAsync("G2Recorder"), instrumentType: null, stepType: null);

		// The update path calls this unconditionally, so it has to be a no-op for
		// a course type that recorded nothing to begin with.
		await CallAsync(
			"SELECT students.delete_student_instrument(@p_student_course_id);",
			("p_student_course_id", enrollmentId));

		var enrollments = await CountEnrollmentsAsync(enrollmentId);
		var instruments = await CountInstrumentsAsync(enrollmentId);

		ShouldlyHelpers.Satisfy(
			() => enrollments.ShouldBe(1),
			() => instruments.ShouldBe(0));
	}

	private async Task<Guid> GivenStudentAsync()
	{
		var studentId = Guid.NewGuid();

		await CallAsync(
			"""
			INSERT INTO students.students (student_id, first_name, last_name, date_of_birth, grade, class, phase, language)
			VALUES (@student_id, 'Kagiso', 'Dlamini', DATE '2014-05-12', 'Grade4', 'A1', 'Junior', 'English');
			""",
			("student_id", studentId));

		return studentId;
	}

	private async Task<Guid> GivenCourseAsync(string courseType)
	{
		var courseId = Guid.NewGuid();

		await CallAsync(
			"""
			INSERT INTO students.courses (course_id, course_type, cost, lesson_structure_id)
			SELECT @course_id, @course_type, 100.00, lesson_structure_id
			FROM students.lesson_structures
			ORDER BY lesson_structure_id
			LIMIT 1;
			""",
			("course_id", courseId),
			("course_type", courseType));

		return courseId;
	}

	/// <summary>
	/// An enrollment as the repository writes one: the enrollment itself, then
	/// the instrument and step where the course type records them.
	/// </summary>
	private async Task<Guid> GivenEnrollmentAsync(Guid studentId, Guid courseId, string? instrumentType, string? stepType)
	{
		var enrollmentId = Guid.NewGuid();

		await CallAsync(
			"SELECT students.create_student_course(@p_student_course_id, @p_student_id, @p_course_id, @p_teacher_id, @p_enrolled_date);",
			("p_student_course_id", enrollmentId),
			("p_student_id", studentId),
			("p_course_id", courseId),
			("p_teacher_id", Guid.NewGuid()),
			("p_enrolled_date", new DateOnly(2026, 1, 19)));

		if (stepType is not null)
		{
			await CallAsync(
				"SELECT students.create_student_instrument(@p_student_course_id, @p_instrument_type, @p_step_type);",
				("p_student_course_id", enrollmentId),
				("p_instrument_type", instrumentType),
				("p_step_type", stepType));
		}

		return enrollmentId;
	}

	private async Task<(Guid TeacherId, string? InstrumentType, string? StepType)> ReadEnrollmentAsync(Guid enrollmentId)
	{
		await using var select = _fixture.Connection.CreateCommand();
		select.CommandText = """
			SELECT sc.teacher_id, si.instrument_type, si.step_type
			FROM students.student_courses sc
			LEFT JOIN students.student_instruments si ON si.student_course_id = sc.student_course_id
			WHERE sc.student_course_id = @student_course_id;
			""";
		select.Parameters.AddWithValue("student_course_id", enrollmentId);

		await using var reader = await select.ExecuteReaderAsync(TestContext.Current.CancellationToken);
		(await reader.ReadAsync(TestContext.Current.CancellationToken)).ShouldBeTrue();

		return (
			reader.GetGuid(0),
			reader.IsDBNull(1) ? null : reader.GetString(1),
			reader.IsDBNull(2) ? null : reader.GetString(2));
	}

	private Task<long> CountEnrollmentsAsync(Guid enrollmentId) =>
		ScalarAsync(
			"SELECT COUNT(*) FROM students.student_courses WHERE student_course_id = @student_course_id;",
			enrollmentId);

	private Task<long> CountInstrumentsAsync(Guid enrollmentId) =>
		ScalarAsync(
			"SELECT COUNT(*) FROM students.student_instruments WHERE student_course_id = @student_course_id;",
			enrollmentId);

	private async Task<long> ScalarAsync(string sql, Guid enrollmentId)
	{
		await using var select = _fixture.Connection.CreateCommand();
		select.CommandText = sql;
		select.Parameters.AddWithValue("student_course_id", enrollmentId);

		return (long)(await select.ExecuteScalarAsync(TestContext.Current.CancellationToken))!;
	}

	private async Task CallAsync(string sql, params (string Name, object? Value)[] parameters)
	{
		await using var command = _fixture.Connection.CreateCommand();
		command.CommandText = sql;
		foreach (var (name, value) in parameters)
		{
			command.Parameters.Add(new NpgsqlParameter(name, value ?? DBNull.Value));
		}

		await command.ExecuteNonQueryAsync(TestContext.Current.CancellationToken);
	}
}