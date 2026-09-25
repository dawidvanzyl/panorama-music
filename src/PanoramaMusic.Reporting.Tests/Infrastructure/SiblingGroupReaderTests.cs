using Microsoft.Extensions.DependencyInjection;
using PanoramaMusic.Reporting.Domain.Interfaces;
using PanoramaMusic.Reporting.Domain.Services;
using PanoramaMusic.Reporting.Tests.Fixtures;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Reporting.Tests.Infrastructure;

public class SiblingGroupReaderTests : IClassFixture<ReportingDatabaseFixture>
{
	private readonly ReportingDatabaseFixture _fixture;

	public SiblingGroupReaderTests(ReportingDatabaseFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	[Trait("AC", "319UC1")]
	public async Task ReadAsync_ABLinkedAndBCLinkedWithOnlyAAndCGiven_AAndCCarryTheSameGroupKey()
	{
		var ct = TestContext.Current.CancellationToken;
		await using var connection = _fixture.OpenConnection();
		var token = Guid.NewGuid().ToString("N")[..8];

		var a = await StudentSeeder.InsertStudentAsync(connection, "A", token, new DateOnly(2013, 1, 1));
		var b = await StudentSeeder.InsertStudentAsync(connection, "B", token, new DateOnly(2014, 1, 1));
		var c = await StudentSeeder.InsertStudentAsync(connection, "C", token, new DateOnly(2015, 1, 1));
		await StudentSeeder.LinkSiblingsAsync(connection, a, b);
		await StudentSeeder.LinkSiblingsAsync(connection, b, c);

		var (memberships, badges) = await _fixture.ExecuteInScopeAsync(async sp =>
		{
			var reader = sp.GetRequiredService<ISiblingGroupReader>();
			var resolver = sp.GetRequiredService<SiblingBadgeResolver>();
			var read = await reader.ReadAsync([a, c], TestContext.Current.CancellationToken);
			return (read, resolver.Resolve([a, c], read));
		}, ct);

		var byId = memberships.ToDictionary(m => m.StudentId);
		ShouldlyHelpers.Satisfy(
			() => memberships.Count.ShouldBe(2),
			() => byId[a].GroupKey.ShouldBe(byId[c].GroupKey),
			() => badges[a].Group.ShouldBe(badges[c].Group));
	}

	[Fact]
	public async Task ReadAsync_ConnectingSiblingIsWaitingListOnly_StillConnectsTheOuterTwo()
	{
		var ct = TestContext.Current.CancellationToken;
		await using var connection = _fixture.OpenConnection();
		var token = Guid.NewGuid().ToString("N")[..8];

		var a = await StudentSeeder.InsertStudentAsync(connection, "A", token, new DateOnly(2013, 1, 1));
		var b = await StudentSeeder.InsertStudentAsync(connection, "B", token, new DateOnly(2014, 1, 1));
		var c = await StudentSeeder.InsertStudentAsync(connection, "C", token, new DateOnly(2015, 1, 1));
		await StudentSeeder.InsertWaitingListOnlyAsync(connection, b);
		await StudentSeeder.LinkSiblingsAsync(connection, a, b);
		await StudentSeeder.LinkSiblingsAsync(connection, b, c);

		var memberships = await _fixture.ExecuteInScopeAsync(async sp =>
		{
			var reader = sp.GetRequiredService<ISiblingGroupReader>();
			return await reader.ReadAsync([a, c], TestContext.Current.CancellationToken);
		}, ct);

		var byId = memberships.ToDictionary(m => m.StudentId);
		byId[a].GroupKey.ShouldBe(byId[c].GroupKey);
	}

	[Fact]
	public async Task ReadAsync_ATriangleOfThreeLinkedStudents_TerminatesAndAllThreeShareOneKey()
	{
		var ct = TestContext.Current.CancellationToken;
		await using var connection = _fixture.OpenConnection();
		var token = Guid.NewGuid().ToString("N")[..8];

		var a = await StudentSeeder.InsertStudentAsync(connection, "A", token, new DateOnly(2013, 1, 1));
		var b = await StudentSeeder.InsertStudentAsync(connection, "B", token, new DateOnly(2014, 1, 1));
		var c = await StudentSeeder.InsertStudentAsync(connection, "C", token, new DateOnly(2015, 1, 1));
		await StudentSeeder.LinkSiblingsAsync(connection, a, b);
		await StudentSeeder.LinkSiblingsAsync(connection, b, c);
		await StudentSeeder.LinkSiblingsAsync(connection, c, a);

		var memberships = await _fixture.ExecuteInScopeAsync(async sp =>
		{
			var reader = sp.GetRequiredService<ISiblingGroupReader>();
			return await reader.ReadAsync([a, b, c], TestContext.Current.CancellationToken);
		}, ct);

		memberships.Select(m => m.GroupKey).Distinct().Count().ShouldBe(1);
	}

	[Fact]
	public async Task ReadAsync_AnUnlinkedStudent_ComesBackWithItsOwnIdAsItsKey()
	{
		var ct = TestContext.Current.CancellationToken;
		await using var connection = _fixture.OpenConnection();
		var token = Guid.NewGuid().ToString("N")[..8];

		var lonely = await StudentSeeder.InsertStudentAsync(connection, "Lonely", token, new DateOnly(2013, 1, 1));

		var memberships = await _fixture.ExecuteInScopeAsync(async sp =>
		{
			var reader = sp.GetRequiredService<ISiblingGroupReader>();
			return await reader.ReadAsync([lonely], TestContext.Current.CancellationToken);
		}, ct);

		memberships.Single().GroupKey.ShouldBe(lonely);
	}

	[Fact]
	public async Task ReadAsync_IdsNotPassedIn_AreNeverReturned()
	{
		var ct = TestContext.Current.CancellationToken;
		await using var connection = _fixture.OpenConnection();
		var token = Guid.NewGuid().ToString("N")[..8];

		var a = await StudentSeeder.InsertStudentAsync(connection, "A", token, new DateOnly(2013, 1, 1));
		var b = await StudentSeeder.InsertStudentAsync(connection, "B", token, new DateOnly(2014, 1, 1));
		await StudentSeeder.LinkSiblingsAsync(connection, a, b);

		var memberships = await _fixture.ExecuteInScopeAsync(async sp =>
		{
			var reader = sp.GetRequiredService<ISiblingGroupReader>();
			return await reader.ReadAsync([a], TestContext.Current.CancellationToken);
		}, ct);

		ShouldlyHelpers.Satisfy(
			() => memberships.Count.ShouldBe(1),
			() => memberships.Single().StudentId.ShouldBe(a));
	}
}