using PanoramaMusic.Reporting.Domain.Enums;
using PanoramaMusic.Reporting.Tests.Fixtures;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Reporting.Tests.Infrastructure;

public class CourseCollectionReaderTests : IClassFixture<ReportingDatabaseFixture>
{
	private readonly ReportingDatabaseFixture _fixture;

	public CourseCollectionReaderTests(ReportingDatabaseFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	[Trait("AC", "318UC3")]
	public async Task ReadAsync_StudentWithInstrumentAndTheoryCourses_ReturnsBothCourses()
	{
		var ct = TestContext.Current.CancellationToken;
		await using var connection = _fixture.OpenConnection();
		var token = Guid.NewGuid().ToString("N")[..8];

		var teacherId = await StudentSeeder.InsertTeacherAsync(connection, "T", token);
		var theoryCourseId = await StudentSeeder.InsertCourseAsync(connection, "Theory", StudentSeeder.TheoryLessonStructureId);
		var instrumentCourseId = await StudentSeeder.InsertCourseAsync(connection, "Instrument", StudentSeeder.InstrumentHourLessonStructureId);

		var studentId = await StudentSeeder.InsertStudentAsync(connection, "Hal", token, new DateOnly(2015, 1, 1));
		var theorySc = await StudentSeeder.InsertStudentCourseAsync(connection, studentId, theoryCourseId, teacherId);
		await StudentSeeder.InsertStudentInstrumentAsync(connection, theorySc, null, "Step2A");
		var instrumentSc = await StudentSeeder.InsertStudentCourseAsync(connection, studentId, instrumentCourseId, teacherId);
		await StudentSeeder.InsertStudentInstrumentAsync(connection, instrumentSc, "Guitar", "Step2A");

		var records = await _fixture.ReadCollectionAsync(ReportCollection.Course, [studentId], ct);

		records.Count(r => r.StudentId == studentId).ShouldBe(2);
	}

	[Fact]
	[Trait("AC", "318UC7")]
	public async Task ReadAsync_ManyStudents_ReturnsEverySeededCourseFromOneCall()
	{
		var ct = TestContext.Current.CancellationToken;
		await using var connection = _fixture.OpenConnection();
		var token = Guid.NewGuid().ToString("N")[..8];

		var teacherId = await StudentSeeder.InsertTeacherAsync(connection, "T", token);
		var courseId = await StudentSeeder.InsertCourseAsync(connection, "Theory", StudentSeeder.TheoryLessonStructureId);

		var studentIds = new List<Guid>();
		for (var i = 0; i < 5; i++)
		{
			var studentId = await StudentSeeder.InsertStudentAsync(connection, $"S{i}", token, new DateOnly(2015, 1, 1));
			var sc = await StudentSeeder.InsertStudentCourseAsync(connection, studentId, courseId, teacherId);
			await StudentSeeder.InsertStudentInstrumentAsync(connection, sc, null, "Step1A");
			studentIds.Add(studentId);
		}

		var records = await _fixture.ReadCollectionAsync(ReportCollection.Course, studentIds, ct);

		studentIds.All(id => records.Count(r => r.StudentId == id) == 1).ShouldBeTrue();
	}

	[Fact]
	[Trait("AC", "318UC10")]
	public async Task ReadAsync_ActiveInactiveAndOrphanTeacher_TeacherExistsFlagMatchesEachShape()
	{
		var ct = TestContext.Current.CancellationToken;
		await using var connection = _fixture.OpenConnection();
		var token = Guid.NewGuid().ToString("N")[..8];

		var activeTeacherId = await StudentSeeder.InsertTeacherAsync(connection, "Active", token, isActive: true);
		var inactiveTeacherId = await StudentSeeder.InsertTeacherAsync(connection, "Inactive", token, isActive: false);
		var orphanTeacherId = Guid.NewGuid();
		var courseId = await StudentSeeder.InsertCourseAsync(connection, "Theory", StudentSeeder.TheoryLessonStructureId);

		var activeStudentId = await StudentSeeder.InsertStudentAsync(connection, "A", token, new DateOnly(2015, 1, 1));
		var activeSc = await StudentSeeder.InsertStudentCourseAsync(connection, activeStudentId, courseId, activeTeacherId);
		await StudentSeeder.InsertStudentInstrumentAsync(connection, activeSc, null, "Step1A");

		var inactiveStudentId = await StudentSeeder.InsertStudentAsync(connection, "I", token, new DateOnly(2015, 1, 1));
		var inactiveSc = await StudentSeeder.InsertStudentCourseAsync(connection, inactiveStudentId, courseId, inactiveTeacherId);
		await StudentSeeder.InsertStudentInstrumentAsync(connection, inactiveSc, null, "Step1A");

		var orphanStudentId = await StudentSeeder.InsertStudentAsync(connection, "O", token, new DateOnly(2015, 1, 1));
		var orphanSc = await StudentSeeder.InsertStudentCourseAsync(connection, orphanStudentId, courseId, orphanTeacherId);
		await StudentSeeder.InsertStudentInstrumentAsync(connection, orphanSc, null, "Step1A");

		var records = await _fixture.ReadCollectionAsync(
			ReportCollection.Course, [activeStudentId, inactiveStudentId, orphanStudentId], ct);

		var active = records.Single(r => r.StudentId == activeStudentId);
		var inactive = records.Single(r => r.StudentId == inactiveStudentId);
		var orphan = records.Single(r => r.StudentId == orphanStudentId);

		ShouldlyHelpers.Satisfy(
			() => active.Sources.GetBoolean("teacherExists").ShouldBeTrue(),
			() => active.Sources.GetBoolean("teacherIsActive").ShouldBeTrue(),
			() => inactive.Sources.GetBoolean("teacherExists").ShouldBeTrue(),
			() => inactive.Sources.GetBoolean("teacherIsActive").ShouldBeFalse(),
			() => orphan.Sources.GetBoolean("teacherExists").ShouldBeFalse());
	}
}