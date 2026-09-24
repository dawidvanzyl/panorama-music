using PanoramaMusic.Reporting.Domain.Enums;
using PanoramaMusic.Reporting.Domain.Registries;
using PanoramaMusic.Reporting.Domain.ValueObjects;
using PanoramaMusic.Reporting.Tests.Fixtures;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Reporting.Tests.Infrastructure;

/// <summary>
/// Exercises <c>PopulationReader</c> through the real DI graph against a live
/// Postgres. Each test scopes its assertions to the students it itself
/// seeded — other facts in this class share the same database — either by
/// filtering on a fact-unique token embedded in a seeded name, or by
/// asserting containment/absence of specific student ids rather than exact
/// counts.
/// </summary>
public class PopulationReaderTests : IClassFixture<ReportingDatabaseFixture>
{
	private readonly ReportingDatabaseFixture _fixture;
	private readonly StudentFieldRegistry _registry = new();
	private static readonly IReadOnlyDictionary<ReportDatasource, IReadOnlyList<FieldOption>> _noDatasourceOptions =
		new Dictionary<ReportDatasource, IReadOnlyList<FieldOption>>();

	public PopulationReaderTests(ReportingDatabaseFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	[Trait("AC", "317UC9")]
	public async Task ReadAsync_TwoSiblingsOneOlder_SiblingCountTwoAndIsEldestFalse()
	{
		var ct = TestContext.Current.CancellationToken;
		await using var connection = _fixture.OpenConnection();

		var mainId = await StudentSeeder.InsertStudentAsync(connection, "Main", $"Sib{Guid.NewGuid():N}", new DateOnly(2015, 1, 1));
		var olderId = await StudentSeeder.InsertStudentAsync(connection, "Older", "Sibling", new DateOnly(2010, 1, 1));
		var youngerId = await StudentSeeder.InsertStudentAsync(connection, "Younger", "Sibling", new DateOnly(2018, 1, 1));
		await StudentSeeder.LinkSiblingsAsync(connection, mainId, olderId);
		await StudentSeeder.LinkSiblingsAsync(connection, mainId, youngerId);

		var definition = ReportDefinition.Create(
			[],
			["student.name", "student.hasSiblings", "student.numberOfSiblings", "student.isEldest"],
			_registry,
			_noDatasourceOptions);

		var population = await _fixture.ReadPopulationAsync(definition, ct);
		var main = population.Single(m => m.StudentId == mainId);

		ShouldlyHelpers.Satisfy(
			() => main.Sources.GetInt32("siblingCount").ShouldBe(2),
			() => main.Sources.GetBoolean("isEldest").ShouldBeFalse());
	}

	[Fact]
	[Trait("AC", "317UC11")]
	public async Task ReadAsync_NameContainsZylCaseInsensitive_ReturnsAmyVanZylAndNotOthers()
	{
		var ct = TestContext.Current.CancellationToken;
		await using var connection = _fixture.OpenConnection();

		var amyId = await StudentSeeder.InsertStudentAsync(connection, "Amy", "van Zyl", new DateOnly(2015, 1, 1));
		var otherId = await StudentSeeder.InsertStudentAsync(connection, "Ben", "NotMatching", new DateOnly(2015, 1, 1));

		var definition = ReportDefinition.Create(
			[new ReportFilterInput("student.name", "contains", ["ZYL"])],
			["student.name"],
			_registry,
			_noDatasourceOptions);

		var population = await _fixture.ReadPopulationAsync(definition, ct);

		ShouldlyHelpers.Satisfy(
			() => population.ShouldContain(m => m.StudentId == amyId),
			() => population.ShouldNotContain(m => m.StudentId == otherId));
	}

	[Fact]
	[Trait("AC", "317UC12")]
	public async Task ReadAsync_HasSiblingNoAndEldestYes_FilterCorrectly()
	{
		var ct = TestContext.Current.CancellationToken;
		await using var connection = _fixture.OpenConnection();

		var unlinkedId = await StudentSeeder.InsertStudentAsync(connection, "Unlinked", $"Solo{Guid.NewGuid():N}", new DateOnly(2015, 1, 1));
		var elderId = await StudentSeeder.InsertStudentAsync(connection, "Elder", $"Pair{Guid.NewGuid():N}", new DateOnly(2010, 1, 1));
		var youngerId = await StudentSeeder.InsertStudentAsync(connection, "Younger", $"Pair{Guid.NewGuid():N}", new DateOnly(2018, 1, 1));
		await StudentSeeder.LinkSiblingsAsync(connection, elderId, youngerId);

		var sameDate = new DateOnly(2012, 6, 1);
		var twinAId = await StudentSeeder.InsertStudentAsync(connection, "TwinA", $"Same{Guid.NewGuid():N}", sameDate);
		var twinBId = await StudentSeeder.InsertStudentAsync(connection, "TwinB", $"Same{Guid.NewGuid():N}", sameDate);
		await StudentSeeder.LinkSiblingsAsync(connection, twinAId, twinBId);

		var noSiblingDefinition = ReportDefinition.Create(
			[new ReportFilterInput("student.hasSiblings", "equals", ["No"])],
			["student.name"],
			_registry,
			_noDatasourceOptions);
		var noSiblingPopulation = await _fixture.ReadPopulationAsync(noSiblingDefinition, ct);

		var eldestDefinition = ReportDefinition.Create(
			[new ReportFilterInput("student.isEldest", "equals", ["Yes"])],
			["student.name"],
			_registry,
			_noDatasourceOptions);
		var eldestPopulation = await _fixture.ReadPopulationAsync(eldestDefinition, ct);

		ShouldlyHelpers.Satisfy(
			() => noSiblingPopulation.ShouldContain(m => m.StudentId == unlinkedId),
			() => noSiblingPopulation.ShouldNotContain(m => m.StudentId == elderId),
			() => noSiblingPopulation.ShouldNotContain(m => m.StudentId == youngerId),
			() => eldestPopulation.ShouldContain(m => m.StudentId == elderId),
			() => eldestPopulation.ShouldNotContain(m => m.StudentId == youngerId),
			() => eldestPopulation.ShouldNotContain(m => m.StudentId == unlinkedId),
			// A tied birth date reads Eldest = Yes for both twins.
			() => eldestPopulation.ShouldContain(m => m.StudentId == twinAId),
			() => eldestPopulation.ShouldContain(m => m.StudentId == twinBId));
	}

	[Fact]
	[Trait("AC", "317UC13")]
	public async Task ReadAsync_SeveralMatchingStudents_OrderedByNameThenGradeThenClass()
	{
		var ct = TestContext.Current.CancellationToken;
		await using var connection = _fixture.OpenConnection();
		var token = Guid.NewGuid().ToString("N")[..8];

		var bravoId = await StudentSeeder.InsertStudentAsync(connection, "Bravo", token, new DateOnly(2015, 1, 1));
		var alphaId = await StudentSeeder.InsertStudentAsync(connection, "Alpha", token, new DateOnly(2015, 1, 1));
		var charlieId = await StudentSeeder.InsertStudentAsync(connection, "Charlie", token, new DateOnly(2015, 1, 1));

		var definition = ReportDefinition.Create(
			[new ReportFilterInput("student.name", "contains", [token])],
			["student.name"],
			_registry,
			_noDatasourceOptions);

		var population = await _fixture.ReadPopulationAsync(definition, ct);

		population.Select(m => m.StudentId).ShouldBe([alphaId, bravoId, charlieId]);
	}

	[Fact]
	[Trait("AC", "317UC14")]
	public async Task ReadAsync_WaitingListOnlyStudent_IsExcludedButEnrolledStudentIsIncluded()
	{
		var ct = TestContext.Current.CancellationToken;
		await using var connection = _fixture.OpenConnection();
		var token = Guid.NewGuid().ToString("N")[..8];

		var enrolledId = await StudentSeeder.InsertStudentAsync(connection, "Enrolled", token, new DateOnly(2015, 1, 1));
		var waitingOnlyId = await StudentSeeder.InsertStudentAsync(connection, "Waiting", token, new DateOnly(2015, 1, 1));
		await StudentSeeder.InsertWaitingListOnlyAsync(connection, waitingOnlyId);

		var definition = ReportDefinition.Create(
			[new ReportFilterInput("student.name", "contains", [token])],
			["student.name"],
			_registry,
			_noDatasourceOptions);

		var population = await _fixture.ReadPopulationAsync(definition, ct);

		ShouldlyHelpers.Satisfy(
			() => population.ShouldContain(m => m.StudentId == enrolledId),
			() => population.ShouldNotContain(m => m.StudentId == waitingOnlyId));
	}

	[Fact]
	[Trait("AC", "317UC15")]
	public async Task ReadAsync_SqlMetacharactersInValue_MatchLiterally()
	{
		var ct = TestContext.Current.CancellationToken;
		await using var connection = _fixture.OpenConnection();
		var token = Guid.NewGuid().ToString("N")[..8];

		var literalId = await StudentSeeder.InsertStudentAsync(connection, $"' OR 1=1 --{token}", "Literal", new DateOnly(2015, 1, 1));
		var otherId = await StudentSeeder.InsertStudentAsync(connection, "Regular", token, new DateOnly(2015, 1, 1));

		var definition = ReportDefinition.Create(
			[new ReportFilterInput("student.name", "contains", [$"' OR 1=1 --{token}"])],
			["student.name"],
			_registry,
			_noDatasourceOptions);

		var population = await _fixture.ReadPopulationAsync(definition, ct);

		ShouldlyHelpers.Satisfy(
			() => population.ShouldContain(m => m.StudentId == literalId),
			() => population.ShouldNotContain(m => m.StudentId == otherId));
	}
}