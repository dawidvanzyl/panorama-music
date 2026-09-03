using Npgsql;
using PanoramaMusic.Students.Tests.Fixtures;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Infrastructure;

/// <summary>
/// The mutual-exclusion rule between the Students roster and the waiting list,
/// as it is actually enforced — in the read functions themselves, not in
/// application code. No handler test can prove this: a mocked repository
/// returns whatever the test tells it to, so only a real Postgres read can show
/// that get_students excludes a waiting-list student and get_waiting_list
/// excludes an enrolled one.
/// </summary>
public class WaitingListFunctionTests : IClassFixture<StudentsDatabaseFixture>
{
	// Individual · Hour · DuringSchool, from seed_lesson_structures.sql.
	private static readonly Guid _duringSchoolLessonStructureId = Guid.Parse("e9ac58cc-d6a5-406e-b6a2-55076a0a3565");

	private readonly StudentsDatabaseFixture _fixture;

	public WaitingListFunctionTests(StudentsDatabaseFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	[Trait("AC", "292UC5")]
	public async Task GetStudents_AStudentHoldingAWaitingListEntry_IsExcludedFromTheRoster()
	{
		var waitlisted = await GivenStudentAsync("Waitlisted", $"Student {Guid.NewGuid()}");
		var enrolled = await GivenStudentAsync("Not Waitlisted", $"Student {Guid.NewGuid()}");
		await GivenWaitingListEntryAsync(waitlisted, _duringSchoolLessonStructureId);

		var studentIds = await ReadStudentIdsAsync();

		ShouldlyHelpers.Satisfy(
			() => studentIds.ShouldNotContain(waitlisted),
			// The rule excludes the waitlisted student specifically — it does not
			// hide the roster wholesale.
			() => studentIds.ShouldContain(enrolled));
	}

	[Fact]
	[Trait("AC", "292UC5")]
	public async Task GetStudents_AStudentHoldingBothAWaitingListEntryAndACourseEnrollment_IsIncludedInTheRoster()
	{
		// The milestone rule (#272 Overview) is that a student is on the waiting
		// list or enrolled, never both and never neither. get_waiting_list already
		// resolves the overlap by excluding an enrolled student; get_students must
		// mirror that rather than excluding unconditionally on the waiting-list row
		// alone — otherwise a student holding both states vanishes from both
		// screens with no way back through the UI (ruling R3).
		var both = await GivenStudentAsync("Both", $"Student {Guid.NewGuid()}");
		await GivenWaitingListEntryAsync(both, _duringSchoolLessonStructureId);
		var courseId = await GivenCourseAsync(_duringSchoolLessonStructureId);
		await GivenEnrollmentAsync(both, courseId);

		var studentIds = await ReadStudentIdsAsync();

		// Enrollment wins: the student is not invisible.
		studentIds.ShouldContain(both);
	}

	[Fact]
	[Trait("AC", "293UC6")]
	public async Task CreateWaitingListEntry_AStudentWhoAlreadyHoldsAnEntry_TheSecondInsertIsRejected()
	{
		// A capture always creates a brand-new student, so no handler path can
		// ever reach this rule — it is the table's own unique constraint that
		// actually settles it, the same reasoning WaitingListEntry's own remarks
		// give for leaving the check to the database. Only a real Postgres insert
		// can prove the constraint exists and fires.
		var student = await GivenStudentAsync("Duplicate", $"Student {Guid.NewGuid()}");
		await GivenWaitingListEntryAsync(student, _duringSchoolLessonStructureId);

		var duplicate = async () => await GivenWaitingListEntryAsync(student, _duringSchoolLessonStructureId);

		await Should.ThrowAsync<PostgresException>(duplicate);
	}

	[Fact]
	[Trait("AC", "292UC6")]
	public async Task GetWaitingList_AStudentWithACourseEnrollment_IsExcludedFromTheWaitingList()
	{
		var enrolledStudent = await GivenStudentAsync("Enrolled", $"Student {Guid.NewGuid()}");
		var stillWaitingStudent = await GivenStudentAsync("StillWaiting", $"Student {Guid.NewGuid()}");
		await GivenWaitingListEntryAsync(enrolledStudent, _duringSchoolLessonStructureId);
		await GivenWaitingListEntryAsync(stillWaitingStudent, _duringSchoolLessonStructureId);
		var courseId = await GivenCourseAsync(_duringSchoolLessonStructureId);
		await GivenEnrollmentAsync(enrolledStudent, courseId);

		var waitingListStudentIds = await ReadWaitingListStudentIdsAsync();

		ShouldlyHelpers.Satisfy(
			// A row can still exist for them here — the entry is not what removed
			// them from the list — but the read excludes it.
			() => waitingListStudentIds.ShouldNotContain(enrolledStudent),
			() => waitingListStudentIds.ShouldContain(stillWaitingStudent));
	}

	private async Task<Guid> GivenStudentAsync(string firstName, string lastName)
	{
		var studentId = Guid.NewGuid();

		await CallAsync(
			"""
			INSERT INTO students.students (student_id, first_name, last_name, date_of_birth, grade, class, phase, language)
			VALUES (@p_student_id, @p_first_name, @p_last_name, @p_date_of_birth, 'Grade4', 'A1', 'Junior', 'English');
			""",
			("p_student_id", studentId),
			("p_first_name", firstName),
			("p_last_name", lastName),
			("p_date_of_birth", new DateOnly(2015, 3, 1)));

		return studentId;
	}

	private Task GivenWaitingListEntryAsync(Guid studentId, Guid lessonStructureId) =>
		CallAsync(
			"""
			INSERT INTO students.waiting_list (waiting_list_entry_id, student_id, lesson_structure_id, instrument_type, notes)
			VALUES (@p_waiting_list_entry_id, @p_student_id, @p_lesson_structure_id, 'Piano', NULL);
			""",
			("p_waiting_list_entry_id", Guid.NewGuid()),
			("p_student_id", studentId),
			("p_lesson_structure_id", lessonStructureId));

	private async Task<Guid> GivenCourseAsync(Guid lessonStructureId)
	{
		var courseId = Guid.NewGuid();

		await CallAsync(
			"SELECT students.create_course(@p_course_id, @p_course_type, @p_cost, @p_lesson_structure_id);",
			("p_course_id", courseId),
			("p_course_type", "Instrument"),
			("p_cost", 450.00m),
			("p_lesson_structure_id", lessonStructureId));

		return courseId;
	}

	private Task GivenEnrollmentAsync(Guid studentId, Guid courseId) =>
		CallAsync(
			"SELECT students.create_student_course(@p_student_course_id, @p_student_id, @p_course_id, @p_teacher_id, @p_enrolled_date);",
			("p_student_course_id", Guid.NewGuid()),
			("p_student_id", studentId),
			("p_course_id", courseId),
			("p_teacher_id", Guid.NewGuid()),
			("p_enrolled_date", new DateOnly(2026, 1, 15)));

	private async Task<List<Guid>> ReadStudentIdsAsync()
	{
		await using var select = _fixture.Connection.CreateCommand();
		select.CommandText = "SELECT student_id FROM students.get_students();";

		await using var reader = await select.ExecuteReaderAsync(TestContext.Current.CancellationToken);
		var ids = new List<Guid>();
		while (await reader.ReadAsync(TestContext.Current.CancellationToken))
		{
			ids.Add(reader.GetGuid(0));
		}

		return ids;
	}

	private async Task<List<Guid>> ReadWaitingListStudentIdsAsync()
	{
		await using var select = _fixture.Connection.CreateCommand();
		select.CommandText = "SELECT student_id FROM students.get_waiting_list();";

		await using var reader = await select.ExecuteReaderAsync(TestContext.Current.CancellationToken);
		var ids = new List<Guid>();
		while (await reader.ReadAsync(TestContext.Current.CancellationToken))
		{
			ids.Add(reader.GetGuid(0));
		}

		return ids;
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