using PanoramaMusic.Reporting.Domain.Enums;
using PanoramaMusic.Reporting.Tests.Fixtures;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Reporting.Tests.Infrastructure;

public class ExtraCurricularCollectionReaderTests : IClassFixture<ReportingDatabaseFixture>
{
	private readonly ReportingDatabaseFixture _fixture;

	public ExtraCurricularCollectionReaderTests(ReportingDatabaseFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	[Trait("AC", "318UC12")]
	public async Task ReadAsync_ActivityWithWednesdayAndMondayPracticeTimes_ReturnsTheAlignedDayAndTimeArrays()
	{
		var ct = TestContext.Current.CancellationToken;
		await using var connection = _fixture.OpenConnection();
		var token = Guid.NewGuid().ToString("N")[..8];

		var activityId = await StudentSeeder.InsertExtraCurricularAsync(connection, $"Choir {token}", "Junior");
		await StudentSeeder.InsertPracticeTimeAsync(connection, activityId, "Wednesday", new TimeOnly(15, 0));
		await StudentSeeder.InsertPracticeTimeAsync(connection, activityId, "Monday", new TimeOnly(14, 0));

		var studentId = await StudentSeeder.InsertStudentAsync(connection, "S", token, new DateOnly(2015, 1, 1));
		await StudentSeeder.AssignExtraCurricularAsync(connection, studentId, activityId);

		var records = await _fixture.ReadCollectionAsync(ReportCollection.ExtraCurricular, [studentId], ct);

		var record = records.Single(r => r.StudentId == studentId);
		var days = record.Sources.GetStrings("practiceDays");
		var times = record.Sources.GetTimes("practiceStartTimes");

		ShouldlyHelpers.Satisfy(
			() => days.ShouldContain("Wednesday"),
			() => days.ShouldContain("Monday"),
			() => times.ShouldContain(new TimeOnly(15, 0)),
			() => times.ShouldContain(new TimeOnly(14, 0)));
	}

	[Fact]
	[Trait("AC", "318UC7")]
	public async Task ReadAsync_ManyStudents_ReturnsEverySeededActivityFromOneCall()
	{
		var ct = TestContext.Current.CancellationToken;
		await using var connection = _fixture.OpenConnection();
		var token = Guid.NewGuid().ToString("N")[..8];

		var activityId = await StudentSeeder.InsertExtraCurricularAsync(connection, $"Art {token}", "Junior");

		var studentIds = new List<Guid>();
		for (var i = 0; i < 5; i++)
		{
			var studentId = await StudentSeeder.InsertStudentAsync(connection, $"S{i}", token, new DateOnly(2015, 1, 1));
			await StudentSeeder.AssignExtraCurricularAsync(connection, studentId, activityId);
			studentIds.Add(studentId);
		}

		var records = await _fixture.ReadCollectionAsync(ReportCollection.ExtraCurricular, studentIds, ct);

		studentIds.All(id => records.Count(r => r.StudentId == id) == 1).ShouldBeTrue();
	}

	[Fact]
	public async Task ReadAsync_ActivityWithNoPracticeTimes_ReturnsEmptyDaysAndTimes()
	{
		var ct = TestContext.Current.CancellationToken;
		await using var connection = _fixture.OpenConnection();
		var token = Guid.NewGuid().ToString("N")[..8];

		var activityId = await StudentSeeder.InsertExtraCurricularAsync(connection, $"Debate {token}", "Senior");
		var studentId = await StudentSeeder.InsertStudentAsync(connection, "S", token, new DateOnly(2015, 1, 1));
		await StudentSeeder.AssignExtraCurricularAsync(connection, studentId, activityId);

		var records = await _fixture.ReadCollectionAsync(ReportCollection.ExtraCurricular, [studentId], ct);

		var record = records.Single(r => r.StudentId == studentId);
		ShouldlyHelpers.Satisfy(
			() => record.Sources.GetStrings("practiceDays").ShouldBeEmpty(),
			() => record.Sources.GetTimes("practiceStartTimes").ShouldBeEmpty());
	}
}