using Moq;
using Npgsql;
using PanoramaMusic.Persistence.Interfaces;
using PanoramaMusic.Persistence.Transactions;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Messages;
using PanoramaMusic.Students.Infrastructure.Repositories;
using PanoramaMusic.Students.Tests.Factories;
using PanoramaMusic.Students.Tests.Fixtures;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Infrastructure;

/// <summary>
/// Resolving a course from its type and its lesson structure — the read an
/// enrolment off the waiting list depends on, since nothing there names a
/// course. A mocked repository returns whatever the test tells it to, so only a
/// real Postgres read can show that the predicate matches on both dimensions
/// and finds nothing when the school offers no such course.
/// </summary>
public class CourseFunctionTests : IClassFixture<StudentsDatabaseFixture>
{
	// Group · HalfHour · DuringSchool, from seed_lesson_structures.sql. Chosen
	// because no other function test builds a catalogue under it.
	private static readonly Guid _lessonStructureId = Guid.Parse("805c3cfd-7d2e-4376-b93b-4b4e2547f5e8");

	// Group · HalfHour · AfterSchool, from seed_lesson_structures.sql.
	private static readonly Guid _otherLessonStructureId = Guid.Parse("d786cc42-4176-437a-badb-8f0ae97bbdc9");

	// Individual · Hour · AfterSchool and Individual · Hour · DuringSchool, from
	// seed_lesson_structures.sql. No committed test in this class touches either.
	private static readonly Guid _individualHourAfterSchoolId = Guid.Parse("42e1c54f-aa5d-4dd0-ab1a-aced05dd3c54");
	private static readonly Guid _individualHourDuringSchoolId = Guid.Parse("e9ac58cc-d6a5-406e-b6a2-55076a0a3565");

	private readonly StudentsDatabaseFixture _fixture;

	public CourseFunctionTests(StudentsDatabaseFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	[Trait("AC", "295UC1")]
	public async Task GetCourseByTypeAndStructure_TheInstrumentCourseForThatStructure_IsResolved()
	{
		var instrument = await GivenCourseAsync("Instrument", _lessonStructureId);
		// A course of another type under the same structure, and an instrument
		// course under another structure: neither may be what comes back.
		await GivenCourseAsync("Theory", _lessonStructureId);
		await GivenCourseAsync("Instrument", _otherLessonStructureId);

		var resolved = await ReadCourseIdAsync("Instrument", _lessonStructureId);

		resolved.ShouldBe(instrument);
	}

	[Fact]
	[Trait("AC", "295UC20")]
	public async Task GetCourseByTypeAndStructure_NoCourseOfThatTypeUnderTheStructure_ResolvesNothing()
	{
		await GivenCourseAsync("G2Recorder", _otherLessonStructureId);

		var resolved = await ReadCourseIdAsync("G1Enrichment", _otherLessonStructureId);

		resolved.ShouldBeNull();
	}

	private async Task<Guid> GivenCourseAsync(string courseType, Guid lessonStructureId)
	{
		var courseId = Guid.NewGuid();

		await using var command = _fixture.Connection.CreateCommand();
		command.CommandText =
			"SELECT students.create_course(@p_course_id, @p_course_type, @p_cost, @p_lesson_structure_id);";
		command.Parameters.Add(new NpgsqlParameter("p_course_id", courseId));
		command.Parameters.Add(new NpgsqlParameter("p_course_type", courseType));
		command.Parameters.Add(new NpgsqlParameter("p_cost", 450.00m));
		command.Parameters.Add(new NpgsqlParameter("p_lesson_structure_id", lessonStructureId));

		await command.ExecuteNonQueryAsync(TestContext.Current.CancellationToken);

		return courseId;
	}

	private async Task<Guid?> ReadCourseIdAsync(string courseType, Guid lessonStructureId)
	{
		await using var command = _fixture.Connection.CreateCommand();
		command.CommandText =
			"SELECT course_id FROM students.get_course_by_type_and_structure(@p_course_type, @p_lesson_structure_id);";
		command.Parameters.Add(new NpgsqlParameter("p_course_type", courseType));
		command.Parameters.Add(new NpgsqlParameter("p_lesson_structure_id", lessonStructureId));

		var result = await command.ExecuteScalarAsync(TestContext.Current.CancellationToken);
		return result is Guid id ? id : null;
	}

	[Fact]
	[Trait("AC", "308UC1")]
	public async Task CreateAsync_PairAlreadyHeld_TranslatesTheUniqueViolationIntoTheRefusal()
	{
		var structure = IndividualHourAfterSchool();
		await using var transaction = await _fixture.Connection.BeginTransactionAsync(TestContext.Current.CancellationToken);
		var repository = RepositoryOver(transaction);

		await repository.CreateAsync(
			CourseFactory.Create(courseType: CourseType.Theory, lessonStructure: structure),
			TestContext.Current.CancellationToken);

		var exception = await Should.ThrowAsync<DomainException>(async () => await repository.CreateAsync(
			CourseFactory.Create(courseType: CourseType.Theory, lessonStructure: structure),
			TestContext.Current.CancellationToken));

		exception.Message.ShouldBe(CourseMessages.AlreadyExists(CourseType.Theory, structure));

		await transaction.RollbackAsync(TestContext.Current.CancellationToken);
	}

	[Fact]
	[Trait("AC", "308UC2")]
	public async Task CreateCourse_TwoCourseTypesOnOneStructure_BothPersist()
	{
		await using var transaction = await _fixture.Connection.BeginTransactionAsync(TestContext.Current.CancellationToken);

		var theory = await GivenCourseInAsync(transaction, "Theory", _individualHourAfterSchoolId);
		var instrument = await GivenCourseInAsync(transaction, "Instrument", _individualHourAfterSchoolId);

		(await CountCoursesInAsync(transaction, theory, instrument)).ShouldBe(2);

		await transaction.RollbackAsync(TestContext.Current.CancellationToken);
	}

	[Fact]
	[Trait("AC", "308UC3")]
	public async Task CreateCourse_OneCourseTypeOnTwoStructures_BothPersist()
	{
		await using var transaction = await _fixture.Connection.BeginTransactionAsync(TestContext.Current.CancellationToken);

		var first = await GivenCourseInAsync(transaction, "Theory", _individualHourAfterSchoolId);
		var second = await GivenCourseInAsync(transaction, "Theory", _individualHourDuringSchoolId);

		(await CountCoursesInAsync(transaction, first, second)).ShouldBe(2);

		await transaction.RollbackAsync(TestContext.Current.CancellationToken);
	}

	[Fact]
	[Trait("AC", "308UC4")]
	public async Task CreateCourse_PairAlreadyHeld_ViolatesTheNamedUniqueIndex()
	{
		await using var transaction = await _fixture.Connection.BeginTransactionAsync(TestContext.Current.CancellationToken);
		await GivenCourseInAsync(transaction, "Theory", _individualHourAfterSchoolId);

		var exception = await Should.ThrowAsync<PostgresException>(
			async () => await GivenCourseInAsync(transaction, "Theory", _individualHourAfterSchoolId));

		ShouldlyHelpers.Satisfy(
			() => exception.SqlState.ShouldBe("23505"),
			() => exception.ConstraintName.ShouldBe("ix_courses_course_type_lesson_structure"));

		await transaction.RollbackAsync(TestContext.Current.CancellationToken);
	}

	[Fact]
	[Trait("AC", "308UC5")]
	public async Task UpdateCostAsync_ExistingCourseWithItsPairUnchanged_IsAcceptedAndTheCostReadsBack()
	{
		var structure = IndividualHourAfterSchool();
		await using var transaction = await _fixture.Connection.BeginTransactionAsync(TestContext.Current.CancellationToken);
		var repository = RepositoryOver(transaction);
		var course = CourseFactory.Create(courseType: CourseType.Theory, cost: 100.00m, lessonStructure: structure);
		await repository.CreateAsync(course, TestContext.Current.CancellationToken);

		course.UpdateCost(275.50m);
		await repository.UpdateCostAsync(course, TestContext.Current.CancellationToken);

		var reread = await repository.GetByIdAsync(course.CourseId, TestContext.Current.CancellationToken);
		reread.ShouldNotBeNull().Cost.ShouldBe(275.50m);

		await transaction.RollbackAsync(TestContext.Current.CancellationToken);
	}

	private static LessonStructure IndividualHourAfterSchool() =>
		LessonStructureFactory.Create(
			_individualHourAfterSchoolId,
			LessonType.Individual,
			DurationType.Hour,
			OccurrenceType.AfterSchool);

	private CourseRepository RepositoryOver(NpgsqlTransaction transaction)
	{
		var unitOfWork = new Mock<IUnitOfWork>();
		unitOfWork.SetupGet(u => u.Connection).Returns(_fixture.Connection);
		unitOfWork.SetupGet(u => u.Transaction).Returns(transaction);

		return new CourseRepository(unitOfWork.Object, Mock.Of<IDomainEventCollector>());
	}

	private async Task<Guid> GivenCourseInAsync(NpgsqlTransaction transaction, string courseType, Guid lessonStructureId)
	{
		var courseId = Guid.NewGuid();

		await using var command = _fixture.Connection.CreateCommand();
		command.Transaction = transaction;
		command.CommandText =
			"SELECT students.create_course(@p_course_id, @p_course_type, @p_cost, @p_lesson_structure_id);";
		command.Parameters.Add(new NpgsqlParameter("p_course_id", courseId));
		command.Parameters.Add(new NpgsqlParameter("p_course_type", courseType));
		command.Parameters.Add(new NpgsqlParameter("p_cost", 450.00m));
		command.Parameters.Add(new NpgsqlParameter("p_lesson_structure_id", lessonStructureId));

		await command.ExecuteNonQueryAsync(TestContext.Current.CancellationToken);

		return courseId;
	}

	private async Task<long> CountCoursesInAsync(NpgsqlTransaction transaction, params Guid[] courseIds)
	{
		await using var command = _fixture.Connection.CreateCommand();
		command.Transaction = transaction;
		command.CommandText = "SELECT COUNT(*) FROM students.courses WHERE course_id = ANY(@ids);";
		command.Parameters.Add(new NpgsqlParameter("ids", courseIds));

		return (long)(await command.ExecuteScalarAsync(TestContext.Current.CancellationToken))!;
	}
}
