using Npgsql;
using PanoramaMusic.Students.Tests.Fixtures;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Infrastructure;

/// <summary>
/// The audit source a guardian write is attributed to, as the database actually
/// decides it. The guardian endpoints name a guardian by its own id with no
/// student in scope, so guardian_belongs_to_waiting_list_only is the whole rule:
/// a mocked repository returns whatever the test tells it to, and a missing
/// predicate here would be invisible to every handler test while quietly
/// mislabelling a security-relevant record.
/// <para>
/// The second half of these tests is the false-attribution direction. Deriving
/// the source from the record rather than from the route is only sound while no
/// write a Teacher can reach from the Students screen looks like the waiting
/// list's, so that is asserted against the roster read itself rather than argued
/// from the SQL by eye.
/// </para>
/// </summary>
public class GuardianWriteSourceFunctionTests : IClassFixture<StudentsDatabaseFixture>
{
	// Individual · Hour · DuringSchool, from seed_lesson_structures.sql.
	private static readonly Guid _lessonStructureId = Guid.Parse("e9ac58cc-d6a5-406e-b6a2-55076a0a3565");

	// Mother, from seed_guardian_relationships.sql.
	private static readonly Guid _relationshipId = Guid.Parse("dee46e4d-22d7-4581-b103-5b9c3fd31a1b");

	private readonly StudentsDatabaseFixture _fixture;

	public GuardianWriteSourceFunctionTests(StudentsDatabaseFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	[Trait("AC", "300UC17")]
	public async Task BelongsToWaitingListOnly_AGuardianEveryHolderIsAWaitingListStudent_IsTrue()
	{
		var first = await GivenWaitingListStudentAsync();
		var second = await GivenWaitingListStudentAsync();
		var guardian = await GivenGuardianAsync(first, second);

		var belongsToWaitingListOnly = await BelongsToWaitingListOnlyAsync(guardian);

		belongsToWaitingListOnly.ShouldBeTrue();
	}

	[Fact]
	[Trait("AC", "300UC14")]
	public async Task BelongsToWaitingListOnly_AGuardianAnEnrolledStudentHolds_IsFalse()
	{
		var enrolled = await GivenEnrolledStudentAsync();
		var guardian = await GivenGuardianAsync(enrolled);

		var belongsToWaitingListOnly = await BelongsToWaitingListOnlyAsync(guardian);

		belongsToWaitingListOnly.ShouldBeFalse();
	}

	[Fact]
	[Trait("AC", "300UC14")]
	public async Task BelongsToWaitingListOnly_AGuardianSharedAcrossAWaitingListAndAnEnrolledSibling_IsFalse()
	{
		// The row is one shared record, so a single enrolled holder makes the whole
		// guardian the roster's — the waiting-list holder does not dilute it.
		var waiting = await GivenWaitingListStudentAsync();
		var enrolled = await GivenEnrolledStudentAsync();
		var guardian = await GivenGuardianAsync(waiting, enrolled);

		var belongsToWaitingListOnly = await BelongsToWaitingListOnlyAsync(guardian);

		belongsToWaitingListOnly.ShouldBeFalse();
	}

	[Fact]
	[Trait("AC", "300UC14")]
	public async Task BelongsToWaitingListOnly_AGuardianARosterStudentWithNoEnrollmentHolds_IsFalse()
	{
		// The case that rules out answering this with guardian_has_enrolled_link. A
		// student added on the Students screen and not yet enrolled has no
		// enrollment either, so that function cannot tell them from a waiting-list
		// student — and their guardian is the roster's. Holding a waiting-list entry
		// is what makes a student the waiting list's, not the absence of a course.
		var notYetEnrolled = await GivenStudentAsync();
		var guardian = await GivenGuardianAsync(notYetEnrolled);

		var belongsToWaitingListOnly = await BelongsToWaitingListOnlyAsync(guardian);
		var hasEnrolledLink = await HasEnrolledLinkAsync(guardian);

		ShouldlyHelpers.Satisfy(
			() => belongsToWaitingListOnly.ShouldBeFalse(),
			// Both are false, which is the point: the two questions are not the same
			// one, and only this function separates the surfaces.
			() => hasEnrolledLink.ShouldBeFalse());
	}

	[Fact]
	[Trait("AC", "300UC14")]
	public async Task BelongsToWaitingListOnly_AGuardianNoStudentHolds_IsFalse()
	{
		// A guardian never exists standalone outside a transaction in flight, and an
		// unheld row belongs to no surface — so the safe answer is the roster's,
		// which is the path that emits what it always has.
		var guardian = await GivenGuardianAsync();

		var belongsToWaitingListOnly = await BelongsToWaitingListOnlyAsync(guardian);

		belongsToWaitingListOnly.ShouldBeFalse();
	}

	[Fact]
	[Trait("AC", "300UC14")]
	public async Task BelongsToWaitingListOnly_EveryGuardianReachableFromTheRoster_IsFalse()
	{
		// The false-attribution direction stated as the property it actually is. A
		// Teacher reaches a guardian by opening a student the roster shows, so if no
		// student get_students returns can hold a guardian this function calls the
		// waiting list's, no Teacher write from the Students screen can be
		// attributed to the waiting list. The rows every other test in this class
		// leaves behind widen the sweep rather than disturbing it.
		var waiting = await GivenWaitingListStudentAsync();
		await GivenGuardianAsync(waiting);
		var enrolled = await GivenEnrolledStudentAsync();
		await GivenWaitingListEntryAsync(enrolled);
		var staleEntryGuardian = await GivenGuardianAsync(enrolled);
		await GivenGuardianAsync(await GivenStudentAsync());

		var reachable = await ReadGuardianIdsHeldByRosterStudentsAsync();
		var attributedToTheWaitingList = new List<Guid>();
		foreach (var guardianId in reachable)
		{
			if (await BelongsToWaitingListOnlyAsync(guardianId))
			{
				attributedToTheWaitingList.Add(guardianId);
			}
		}

		ShouldlyHelpers.Satisfy(
			// A student carrying a stale entry alongside an enrollment is on the
			// roster (#272 Overview), so their guardian must be inside this sweep —
			// the property proves nothing if the awkward case falls outside it.
			() => reachable.ShouldContain(staleEntryGuardian),
			() => attributedToTheWaitingList.ShouldBeEmpty());
	}

	[Fact]
	[Trait("AC", "300UC14")]
	public async Task GetWaitingListEntryByStudentId_EveryStudentTheRosterShows_ResolvesToNoEntry()
	{
		// The same property for the student-scoped half of the resolver, which the
		// sibling and guardian-link writes ask. A student the roster shows either
		// holds no entry or holds one alongside an enrollment, and this read
		// excludes the second — so a write a Teacher makes through a shared tab is
		// attributed to the roster whatever state the record is in.
		await GivenWaitingListStudentAsync();
		var enrolled = await GivenEnrolledStudentAsync();
		await GivenWaitingListEntryAsync(enrolled);
		await GivenStudentAsync();

		var rosterStudentIds = await ReadRosterStudentIdsAsync();
		var attributedToTheWaitingList = new List<Guid>();
		foreach (var studentId in rosterStudentIds)
		{
			if (await ResolvesToAnEntryAsync(studentId))
			{
				attributedToTheWaitingList.Add(studentId);
			}
		}

		ShouldlyHelpers.Satisfy(
			() => rosterStudentIds.ShouldContain(enrolled),
			() => attributedToTheWaitingList.ShouldBeEmpty());
	}

	private async Task<Guid> GivenStudentAsync()
	{
		var studentId = Guid.NewGuid();

		await CallAsync(
			"""
			INSERT INTO students.students (student_id, first_name, last_name, date_of_birth, grade, class, phase, language)
			VALUES (@p_student_id, 'Source', @p_last_name, @p_date_of_birth, 'Grade4', 'A1', 'Junior', 'English');
			""",
			("p_student_id", studentId),
			("p_last_name", $"Student {Guid.NewGuid()}"),
			("p_date_of_birth", new DateOnly(2015, 3, 1)));

		return studentId;
	}

	private async Task<Guid> GivenWaitingListStudentAsync()
	{
		var studentId = await GivenStudentAsync();
		await GivenWaitingListEntryAsync(studentId);

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

	private async Task<Guid> GivenWaitingListEntryAsync(Guid studentId)
	{
		var entryId = Guid.NewGuid();

		await CallAsync(
			"SELECT students.create_waiting_list_entry(@p_id, @p_student_id, @p_structure, @p_instrument, @p_notes, @p_added_at);",
			("p_id", entryId),
			("p_student_id", studentId),
			("p_structure", _lessonStructureId),
			("p_instrument", "Piano"),
			("p_notes", null),
			("p_added_at", new DateTime(2026, 4, 7, 6, 30, 0, DateTimeKind.Utc)));

		return entryId;
	}

	private async Task<Guid> GivenGuardianAsync(params Guid[] studentIds)
	{
		var guardianId = Guid.NewGuid();

		await CallAsync(
			"""
			SELECT students.create_guardian(@p_guardian_id, @p_relationship_id, 'Source', @p_surname,
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

	private Task<bool> BelongsToWaitingListOnlyAsync(Guid guardianId) =>
		ReadBooleanAsync(
			"SELECT students.guardian_belongs_to_waiting_list_only(@p_guardian_id);", ("p_guardian_id", guardianId));

	private Task<bool> HasEnrolledLinkAsync(Guid guardianId) =>
		ReadBooleanAsync(
			"SELECT students.guardian_has_enrolled_link(@p_guardian_id);", ("p_guardian_id", guardianId));

	private async Task<bool> ResolvesToAnEntryAsync(Guid studentId)
	{
		await using var command = _fixture.Connection.CreateCommand();
		command.CommandText = "SELECT student_id FROM students.get_waiting_list_entry_by_student_id(@p_student_id);";
		command.Parameters.Add(new NpgsqlParameter("p_student_id", studentId));

		return await command.ExecuteScalarAsync(TestContext.Current.CancellationToken) is Guid;
	}

	private async Task<bool> ReadBooleanAsync(string sql, params (string Name, object? Value)[] parameters)
	{
		await using var command = _fixture.Connection.CreateCommand();
		command.CommandText = sql;
		foreach (var (name, value) in parameters)
		{
			command.Parameters.Add(new NpgsqlParameter(name, value ?? DBNull.Value));
		}

		return (bool)(await command.ExecuteScalarAsync(TestContext.Current.CancellationToken))!;
	}

	private Task<List<Guid>> ReadGuardianIdsHeldByRosterStudentsAsync() =>
		ReadIdsAsync(
			"""
			SELECT DISTINCT sg.guardian_id
			FROM students.student_guardians sg
			JOIN students.get_students() s ON s.student_id = sg.student_id;
			""");

	private Task<List<Guid>> ReadRosterStudentIdsAsync() =>
		ReadIdsAsync("SELECT student_id FROM students.get_students();");

	private async Task<List<Guid>> ReadIdsAsync(string sql)
	{
		await using var select = _fixture.Connection.CreateCommand();
		select.CommandText = sql;

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