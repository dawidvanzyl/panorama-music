using PanoramaMusic.Reporting.Domain.Enums;
using PanoramaMusic.Reporting.Tests.Fixtures;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Reporting.Tests.Infrastructure;

public class DatasourceOptionReaderTests : IClassFixture<ReportingDatabaseFixture>
{
	private readonly ReportingDatabaseFixture _fixture;

	public DatasourceOptionReaderTests(ReportingDatabaseFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	[Trait("AC", "318UC14")]
	public async Task ReadAsync_GuardianRelationship_ListsEveryRelationshipByItsLabel()
	{
		var ct = TestContext.Current.CancellationToken;

		var options = await _fixture.ReadOptionsAsync(ReportDatasource.GuardianRelationship, ct);

		options.ShouldContain(option => option.Label == "Father" && option.Value == StudentSeeder.FatherRelationshipId.ToString());
	}

	[Fact]
	[Trait("AC", "318UC14")]
	public async Task ReadAsync_Teacher_ListsActiveAndInactiveTeachersWithTheInactiveSuffix()
	{
		var ct = TestContext.Current.CancellationToken;
		await using var connection = _fixture.OpenConnection();
		var token = Guid.NewGuid().ToString("N")[..8];

		var activeId = await StudentSeeder.InsertTeacherAsync(connection, "Amy", token, isActive: true);
		var inactiveId = await StudentSeeder.InsertTeacherAsync(connection, "Ben", token, isActive: false);

		var options = await _fixture.ReadOptionsAsync(ReportDatasource.Teacher, ct);

		ShouldlyHelpers.Satisfy(
			() => options.ShouldContain(option => option.Value == activeId.ToString() && option.Label == $"Amy {token}"),
			() => options.ShouldContain(option => option.Value == inactiveId.ToString() && option.Label == $"Ben {token} (inactive)"));
	}

	[Fact]
	[Trait("AC", "318UC14")]
	public async Task ReadAsync_ExtraCurricular_ListsEachDistinctActivityAsDescriptionAndPhase()
	{
		var ct = TestContext.Current.CancellationToken;
		await using var connection = _fixture.OpenConnection();
		var token = Guid.NewGuid().ToString("N")[..8];

		var activityId = await StudentSeeder.InsertExtraCurricularAsync(connection, $"Choir {token}", "Junior");
		await StudentSeeder.InsertPracticeTimeAsync(connection, activityId, "Monday", new TimeOnly(14, 0));
		await StudentSeeder.InsertPracticeTimeAsync(connection, activityId, "Wednesday", new TimeOnly(15, 0));

		var options = await _fixture.ReadOptionsAsync(ReportDatasource.ExtraCurricular, ct);

		options.Count(option => option.Value == activityId.ToString()).ShouldBe(1);
		options.ShouldContain(option => option.Value == activityId.ToString() && option.Label == $"Choir {token} (Junior)");
	}
}
