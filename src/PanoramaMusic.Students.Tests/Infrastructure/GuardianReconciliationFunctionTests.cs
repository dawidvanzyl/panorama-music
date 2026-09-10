using Npgsql;
using PanoramaMusic.Students.Tests.Fixtures;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Infrastructure;

/// <summary>
/// Which links a family is missing, as the database actually decides it.
/// <para>
/// The whole rule lives in this function — who counts as an enrolled sibling,
/// and which guardians they already hold. A mocked repository returns whatever
/// the test tells it to, so a handler test can only prove that the links it was
/// handed were created. A missing predicate here would be invisible to every one
/// of them, and would show up as a guardian linked twice or a waiting sibling
/// written to.
/// </para>
/// </summary>
public class GuardianReconciliationFunctionTests : IClassFixture<StudentsDatabaseFixture>
{
	// Individual · Hour · DuringSchool, from seed_lesson_structures.sql.
	private static readonly Guid _lessonStructureId = Guid.Parse("e9ac58cc-d6a5-406e-b6a2-55076a0a3565");

	// Mother, from seed_guardian_relationships.sql.
	private static readonly Guid _relationshipId = Guid.Parse("dee46e4d-22d7-4581-b103-5b9c3fd31a1b");

	private readonly StudentsDatabaseFixture _fixture;

	public GuardianReconciliationFunctionTests(StudentsDatabaseFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	[Trait("AC", "306UC1")]
	public async Task GetMissingEnrolledSiblingGuardianLinks_AnEnrolledSiblingLackingAGuardianTheStudentHolds_NamesThatLink()
	{
		var student = await GivenWaitingListStudentAsync();
		var enrolledSibling = await GivenEnrolledStudentAsync();
		await GivenSiblingsAsync(student, enrolledSibling);
		var guardian = await GivenGuardianAsync(student);

		var missing = await ReadMissingLinksAsync(student);

		missing.ShouldBe([(enrolledSibling, guardian)]);
	}

	[Fact]
	[Trait("AC", "306UC1")]
	public async Task GetMissingEnrolledSiblingGuardianLinks_SeveralEnrolledSiblings_NamesTheLinkForEveryOne()
	{
		// The case that catches a reconciliation stopping after the first sibling.
		var student = await GivenWaitingListStudentAsync();
		var first = await GivenEnrolledStudentAsync();
		var second = await GivenEnrolledStudentAsync();
		await GivenSiblingsAsync(student, first);
		await GivenSiblingsAsync(student, second);
		var guardian = await GivenGuardianAsync(student);

		var missing = await ReadMissingLinksAsync(student);

		missing.ShouldBe([(first, guardian), (second, guardian)], ignoreOrder: true);
	}

	[Fact]
	[Trait("AC", "306UC2")]
	public async Task GetMissingEnrolledSiblingGuardianLinks_AGuardianTheSiblingAlreadyHolds_NamesNothing()
	{
		var student = await GivenWaitingListStudentAsync();
		var enrolledSibling = await GivenEnrolledStudentAsync();
		await GivenSiblingsAsync(student, enrolledSibling);
		await GivenGuardianAsync(student, enrolledSibling);

		var missing = await ReadMissingLinksAsync(student);

		missing.ShouldBeEmpty();
	}

	[Fact]
	[Trait("AC", "306UC2")]
	public async Task GetMissingEnrolledSiblingGuardianLinks_OneSharedGuardianAndOneWithheld_NamesOnlyTheWithheldOne()
	{
		// The realistic family, and the one where creating and skipping have to
		// happen in the same answer.
		var student = await GivenWaitingListStudentAsync();
		var enrolledSibling = await GivenEnrolledStudentAsync();
		await GivenSiblingsAsync(student, enrolledSibling);
		await GivenGuardianAsync(student, enrolledSibling);
		var withheld = await GivenGuardianAsync(student);

		var missing = await ReadMissingLinksAsync(student);

		missing.ShouldBe([(enrolledSibling, withheld)]);
	}

	[Fact]
	[Trait("AC", "306UC3")]
	public async Task GetMissingEnrolledSiblingGuardianLinks_SiblingsWhoAreThemselvesWaiting_NamesNothing()
	{
		// A waiting sibling received the guardian when it was added — nothing was
		// ever withheld from them, so there is nothing to repair.
		var student = await GivenWaitingListStudentAsync();
		var waitingSibling = await GivenWaitingListStudentAsync();
		await GivenSiblingsAsync(student, waitingSibling);
		await GivenGuardianAsync(student);

		var missing = await ReadMissingLinksAsync(student);

		missing.ShouldBeEmpty();
	}

	[Fact]
	[Trait("AC", "306UC4")]
	public async Task GetMissingEnrolledSiblingGuardianLinks_AStudentWithNoSiblings_NamesNothing()
	{
		var student = await GivenWaitingListStudentAsync();
		await GivenGuardianAsync(student);

		var missing = await ReadMissingLinksAsync(student);

		missing.ShouldBeEmpty();
	}

	[Fact]
	[Trait("AC", "306UC1")]
	public async Task GetMissingEnrolledSiblingGuardianLinks_AnEnrolledSiblingsOwnGuardian_IsNotPulledBackOntoTheStudent()
	{
		// One direction only. A guardian the enrolled sibling holds and the student
		// does not is the sync path's business, not this one's, and a row naming the
		// student here would have this write to a record it has no business
		// touching.
		var student = await GivenWaitingListStudentAsync();
		var enrolledSibling = await GivenEnrolledStudentAsync();
		await GivenSiblingsAsync(student, enrolledSibling);
		await GivenGuardianAsync(enrolledSibling);

		var missing = await ReadMissingLinksAsync(student);

		missing.ShouldBeEmpty();
	}

	private async Task<Guid> GivenStudentAsync()
	{
		var studentId = Guid.NewGuid();

		await CallAsync(
			"""
			INSERT INTO students.students (student_id, first_name, last_name, date_of_birth, grade, class, phase, language)
			VALUES (@p_student_id, 'Reconcile', @p_last_name, @p_date_of_birth, 'Grade4', 'A1', 'Junior', 'English');
			""",
			("p_student_id", studentId),
			("p_last_name", $"Student {Guid.NewGuid()}"),
			("p_date_of_birth", new DateOnly(2015, 3, 1)));

		return studentId;
	}

	private async Task<Guid> GivenWaitingListStudentAsync()
	{
		var studentId = await GivenStudentAsync();

		await CallAsync(
			"SELECT students.create_waiting_list_entry(@p_id, @p_student_id, @p_structure, @p_instrument, @p_notes, @p_added_at);",
			("p_id", Guid.NewGuid()),
			("p_student_id", studentId),
			("p_structure", _lessonStructureId),
			("p_instrument", "Piano"),
			("p_notes", null),
			("p_added_at", new DateTime(2026, 4, 7, 6, 30, 0, DateTimeKind.Utc)));

		return studentId;
	}

	private async Task<Guid> GivenEnrolledStudentAsync()
	{
		var studentId = await GivenStudentAsync();
		var courseId = Guid.NewGuid();

		await CallAsync(
			"SELECT students.create_course(@p_course_id, @p_course_type, @p_cost, @p_lesson_structure_id);",
			("p_course_id", courseId),
			("p_course_type", "Instrument"),
			("p_cost", 450.00m),
			("p_lesson_structure_id", _lessonStructureId));

		await CallAsync(
			"SELECT students.create_student_course(@p_student_course_id, @p_student_id, @p_course_id, @p_teacher_id, @p_enrolled_date);",
			("p_student_course_id", Guid.NewGuid()),
			("p_student_id", studentId),
			("p_course_id", courseId),
			("p_teacher_id", Guid.NewGuid()),
			("p_enrolled_date", new DateOnly(2026, 1, 15)));

		return studentId;
	}

	/// <summary>
	/// Links two students as siblings, both directions, the way the repository
	/// does — the function reads the rows and a one-way link would answer for only
	/// one of them.
	/// </summary>
	private async Task GivenSiblingsAsync(Guid studentId, Guid siblingId)
	{
		await CallAsync(
			"SELECT students.create_sibling(@p_student_id, @p_sibling_id);",
			("p_student_id", studentId),
			("p_sibling_id", siblingId));
		await CallAsync(
			"SELECT students.create_sibling(@p_student_id, @p_sibling_id);",
			("p_student_id", siblingId),
			("p_sibling_id", studentId));
	}

	private async Task<Guid> GivenGuardianAsync(params Guid[] studentIds)
	{
		var guardianId = Guid.NewGuid();

		await CallAsync(
			"""
			SELECT students.create_guardian(@p_guardian_id, @p_relationship_id, 'Reconcile', @p_surname,
				'0821234567', @p_email, TRUE, TRUE, FALSE);
			""",
			("p_guardian_id", guardianId),
			("p_relationship_id", _relationshipId),
			("p_surname", $"Guardian {Guid.NewGuid()}"),
			("p_email", $"{Guid.NewGuid():N}@example.com"));

		foreach (var studentId in studentIds)
		{
			await CallAsync(
				"SELECT students.create_student_guardian(@p_student_id, @p_guardian_id);",
				("p_student_id", studentId),
				("p_guardian_id", guardianId));
		}

		return guardianId;
	}

	private async Task<List<(Guid StudentId, Guid GuardianId)>> ReadMissingLinksAsync(Guid studentId)
	{
		await using var select = _fixture.Connection.CreateCommand();
		select.CommandText =
			"SELECT student_id, guardian_id FROM students.get_missing_enrolled_sibling_guardian_links(@p_student_id);";
		select.Parameters.Add(new NpgsqlParameter("p_student_id", studentId));

		await using var reader = await select.ExecuteReaderAsync(TestContext.Current.CancellationToken);
		var links = new List<(Guid, Guid)>();
		while (await reader.ReadAsync(TestContext.Current.CancellationToken))
		{
			links.Add((reader.GetGuid(0), reader.GetGuid(1)));
		}

		return links;
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