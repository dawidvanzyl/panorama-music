using PanoramaMusic.Reporting.Domain.Enums;
using PanoramaMusic.Reporting.Tests.Fixtures;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Reporting.Tests.Infrastructure;

public class GuardianCollectionReaderTests : IClassFixture<ReportingDatabaseFixture>
{
	private readonly ReportingDatabaseFixture _fixture;

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
}