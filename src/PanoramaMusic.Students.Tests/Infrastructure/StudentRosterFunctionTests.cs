using Moq;
using Npgsql;
using PanoramaMusic.Persistence.Interfaces;
using PanoramaMusic.Persistence.Transactions;
using PanoramaMusic.Students.Infrastructure.Repositories;
using PanoramaMusic.Students.Tests.Fixtures;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Infrastructure;

/// <summary>
/// The teachers a roster student carries, read through the real get_students
/// function and the repository mapping — a mocked repository returns whatever
/// the test tells it to, so only a real Postgres read can show the array column
/// is aggregated per student and materialised into the domain.
/// </summary>
public class StudentRosterFunctionTests : IClassFixture<StudentsDatabaseFixture>
{
	// Individual · Hour · DuringSchool, from seed_lesson_structures.sql.
	private static readonly Guid _lessonStructureId = Guid.Parse("e9ac58cc-d6a5-406e-b6a2-55076a0a3565");

	private readonly StudentsDatabaseFixture _fixture;

	public StudentRosterFunctionTests(StudentsDatabaseFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	[Trait("AC", "341UC1")]
	public async Task GetAllAsync_StudentWithCoursesUnderTwoTeachers_CarriesBothAndAStudentWithNoCourseCarriesNone()
	{
		var instrumentCourse = await _fixture.EnsureCourseAsync("Instrument", _lessonStructureId);
		var theoryCourse = await _fixture.EnsureCourseAsync("Theory", _lessonStructureId);
		var annaId = Guid.NewGuid();
		var raviId = Guid.NewGuid();
		await using var transaction = await _fixture.Connection.BeginTransactionAsync(TestContext.Current.CancellationToken);
		var twoTeachers = await GivenStudentAsync(transaction);
		var noCourse = await GivenStudentAsync(transaction);
		await GivenEnrollmentAsync(transaction, twoTeachers, instrumentCourse, annaId);
		await GivenEnrollmentAsync(transaction, twoTeachers, theoryCourse, raviId);

		var roster = await RepositoryOver(transaction).GetAllAsync(TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => roster.Single(r => r.Student.StudentId == twoTeachers).TeacherIds.ShouldBe([annaId, raviId], ignoreOrder: true),
			() => roster.Single(r => r.Student.StudentId == noCourse).TeacherIds.ShouldBeEmpty());

		await transaction.RollbackAsync(TestContext.Current.CancellationToken);
	}

	[Fact]
	[Trait("AC", "341UC2")]
	public async Task GetAllAsync_StudentWithTwoCoursesUnderTheSameTeacher_CarriesThatTeacherOnce()
	{
		var instrumentCourse = await _fixture.EnsureCourseAsync("Instrument", _lessonStructureId);
		var theoryCourse = await _fixture.EnsureCourseAsync("Theory", _lessonStructureId);
		var annaId = Guid.NewGuid();
		await using var transaction = await _fixture.Connection.BeginTransactionAsync(TestContext.Current.CancellationToken);
		var student = await GivenStudentAsync(transaction);
		await GivenEnrollmentAsync(transaction, student, instrumentCourse, annaId);
		await GivenEnrollmentAsync(transaction, student, theoryCourse, annaId);

		var roster = await RepositoryOver(transaction).GetAllAsync(TestContext.Current.CancellationToken);

		roster.Single(r => r.Student.StudentId == student).TeacherIds.ShouldBe([annaId]);

		await transaction.RollbackAsync(TestContext.Current.CancellationToken);
	}

	private async Task<Guid> GivenStudentAsync(NpgsqlTransaction transaction)
	{
		var studentId = Guid.NewGuid();

		await using var command = _fixture.Connection.CreateCommand();
		command.Transaction = transaction;
		command.CommandText =
			"""
			INSERT INTO students.students (student_id, first_name, last_name, date_of_birth, grade, class, phase, language)
			VALUES (@p_student_id, 'Roster', @p_last_name, @p_date_of_birth, 'Grade4', 'A1', 'Junior', 'English');
			""";
		command.Parameters.Add(new NpgsqlParameter("p_student_id", studentId));
		command.Parameters.Add(new NpgsqlParameter("p_last_name", $"Student {studentId}"));
		command.Parameters.Add(new NpgsqlParameter("p_date_of_birth", new DateOnly(2015, 3, 1)));
		await command.ExecuteNonQueryAsync(TestContext.Current.CancellationToken);

		return studentId;
	}

	private async Task GivenEnrollmentAsync(NpgsqlTransaction transaction, Guid studentId, Guid courseId, Guid teacherId)
	{
		await using var command = _fixture.Connection.CreateCommand();
		command.Transaction = transaction;
		command.CommandText =
			"SELECT students.create_student_course(@p_student_course_id, @p_student_id, @p_course_id, @p_teacher_id, @p_enrolled_date);";
		command.Parameters.Add(new NpgsqlParameter("p_student_course_id", Guid.NewGuid()));
		command.Parameters.Add(new NpgsqlParameter("p_student_id", studentId));
		command.Parameters.Add(new NpgsqlParameter("p_course_id", courseId));
		command.Parameters.Add(new NpgsqlParameter("p_teacher_id", teacherId));
		command.Parameters.Add(new NpgsqlParameter("p_enrolled_date", new DateOnly(2026, 1, 15)));
		await command.ExecuteNonQueryAsync(TestContext.Current.CancellationToken);
	}

	private StudentRepository RepositoryOver(NpgsqlTransaction transaction)
	{
		var unitOfWork = new Mock<IUnitOfWork>();
		unitOfWork.SetupGet(u => u.Connection).Returns(_fixture.Connection);
		unitOfWork.SetupGet(u => u.Transaction).Returns(transaction);

		return new StudentRepository(unitOfWork.Object, Mock.Of<IDomainEventCollector>());
	}
}