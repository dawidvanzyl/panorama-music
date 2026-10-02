using PanoramaMusic.Reporting.Domain.Enums;
using PanoramaMusic.Reporting.Domain.Registries;
using PanoramaMusic.Reporting.Domain.ValueObjects;
using PanoramaMusic.Reporting.Tests.Fixtures;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Reporting.Tests.Infrastructure;

public class GuardianCollectionReaderTests : IClassFixture<ReportingDatabaseFixture>
{
	private readonly ReportingDatabaseFixture _fixture;
	private readonly StudentFieldRegistry _registry = new();
	private static readonly IReadOnlyDictionary<ReportDatasource, IReadOnlyList<FieldOption>> _noDatasourceOptions =
		new Dictionary<ReportDatasource, IReadOnlyList<FieldOption>>();

	public GuardianCollectionReaderTests(ReportingDatabaseFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	[Trait("AC", "318UC9")]
	public async Task ReadAsync_SiphoVanZylFather_ReturnsTheRelationshipNameAlongsideTheGuardian()
	{
		var ct = TestContext.Current.CancellationToken;
		await using var connection = _fixture.OpenConnection();
		var token = Guid.NewGuid().ToString("N")[..8];

		var studentId = await StudentSeeder.InsertStudentAsync(connection, "Sipho", token, new DateOnly(2015, 1, 1));
		await StudentSeeder.InsertGuardianAsync(connection, studentId, "Sipho", $"van Zyl{token}", StudentSeeder.FatherRelationshipId);

		var records = await _fixture.ReadCollectionAsync(ReportCollection.Guardian, [studentId], ct);

		var record = records.Single(r => r.StudentId == studentId);
		ShouldlyHelpers.Satisfy(
			() => record.Sources.GetString("firstName").ShouldBe("Sipho"),
			() => record.Sources.GetString("surname").ShouldBe($"van Zyl{token}"),
			() => record.Sources.GetString("relationship").ShouldBe("Father"));
	}

	[Fact]
	[Trait("AC", "318UC7")]
	public async Task ReadAsync_ManyStudents_ReturnsEverySeededGuardianFromOneCall()
	{
		var ct = TestContext.Current.CancellationToken;
		await using var connection = _fixture.OpenConnection();
		var token = Guid.NewGuid().ToString("N")[..8];

		var studentIds = new List<Guid>();
		for (var i = 0; i < 5; i++)
		{
			var studentId = await StudentSeeder.InsertStudentAsync(connection, $"S{i}", token, new DateOnly(2015, 1, 1));
			await StudentSeeder.InsertGuardianAsync(connection, studentId, "G", token, StudentSeeder.FatherRelationshipId);
			studentIds.Add(studentId);
		}

		var records = await _fixture.ReadCollectionAsync(ReportCollection.Guardian, studentIds, ct);

		studentIds.All(id => records.Count(r => r.StudentId == id) == 1).ShouldBeTrue();
	}

	[Fact]
	[Trait("AC", "329UC2")]
	public async Task ReadAsync_TwoGuardianFilters_ReturnsOnlyTheGuardianMeetingBoth()
	{
		var ct = TestContext.Current.CancellationToken;
		await using var connection = _fixture.OpenConnection();
		var token = Guid.NewGuid().ToString("N")[..8];

		var studentId = await StudentSeeder.InsertStudentAsync(connection, "Cal", token, new DateOnly(2015, 1, 1));
		await StudentSeeder.InsertGuardianAsync(
			connection, studentId, "GBoth", token, StudentSeeder.FatherRelationshipId, receivesCorrespondence: true, responsibleForPayment: true);
		await StudentSeeder.InsertGuardianAsync(
			connection, studentId, "GCorr", token, StudentSeeder.FatherRelationshipId, receivesCorrespondence: true, responsibleForPayment: false);
		await StudentSeeder.InsertGuardianAsync(
			connection, studentId, "GPay", token, StudentSeeder.FatherRelationshipId, receivesCorrespondence: false, responsibleForPayment: true);

		var definition = ReportDefinition.Create(
			[
				new ReportFilterInput("guardian.receivesCorrespondence", "equals", ["Yes"]),
				new ReportFilterInput("guardian.responsibleForPayment", "equals", ["Yes"]),
			],
			["student.name"],
			_registry,
			_noDatasourceOptions);

		var records = await _fixture.ReadCollectionAsync(
			ReportCollection.Guardian, [studentId], ct, definition.FiltersFor(ReportCollection.Guardian));

		var record = records.ShouldHaveSingleItem();
		record.Sources.GetString("firstName").ShouldBe("GBoth");
	}
}