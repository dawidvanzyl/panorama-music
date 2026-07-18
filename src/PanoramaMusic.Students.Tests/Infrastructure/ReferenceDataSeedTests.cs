using PanoramaMusic.Students.Tests.Fixtures;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Infrastructure;

public class ReferenceDataSeedTests : IClassFixture<StudentsDatabaseFixture>
{
	private static readonly string[] _expectedGuardianRelationships =
	[
		"Mother",
		"Father",
		"Stepmother",
		"Stepfather",
		"Grandmother",
		"Grandfather",
		"Legal Guardian",
		"Other",
	];

	private static readonly string[] _validLessonTypes = ["Individual", "Group"];
	private static readonly string[] _validDurationTypes = ["Hour", "HalfHour"];
	private static readonly string[] _validOccurrenceTypes = ["DuringSchool", "AfterSchool"];

	private readonly StudentsDatabaseFixture _fixture;

	public ReferenceDataSeedTests(StudentsDatabaseFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	[Trait("AC", "197UC1")]
	public async Task Seed_FreshlyMigratedDatabase_GuardianRelationshipsContainsFullDefinedSet()
	{
		var names = await SelectGuardianRelationshipNamesAsync();

		ShouldlyHelpers.Satisfy(
			() => names.Count.ShouldBe(_expectedGuardianRelationships.Length),
			() => names.ShouldBe(_expectedGuardianRelationships, ignoreOrder: true));
	}

	[Fact]
	[Trait("AC", "197UC2")]
	public async Task Seed_FreshlyMigratedDatabase_LessonStructuresContainsOnlyValidUniqueCombinations()
	{
		var combinations = await SelectLessonStructureCombinationsAsync();

		ShouldlyHelpers.Satisfy(
			() => combinations.Count.ShouldBe(8),
			() => combinations.Distinct().Count().ShouldBe(combinations.Count),
			() => combinations.ShouldAllBe(c => _validLessonTypes.Contains(c.LessonType)),
			() => combinations.ShouldAllBe(c => _validDurationTypes.Contains(c.DurationType)),
			() => combinations.ShouldAllBe(c => _validOccurrenceTypes.Contains(c.OccurrenceType)));
	}

	[Fact]
	[Trait("AC", "197UC3")]
	public async Task Seed_RunsAgainAfterInitialSeed_NoDuplicateRowsCreated()
	{
		_fixture.RerunMigrations();

		var names = await SelectGuardianRelationshipNamesAsync();
		var combinations = await SelectLessonStructureCombinationsAsync();

		ShouldlyHelpers.Satisfy(
			() => names.Count.ShouldBe(_expectedGuardianRelationships.Length),
			() => combinations.Count.ShouldBe(8));
	}

	private async Task<List<string>> SelectGuardianRelationshipNamesAsync()
	{
		var names = new List<string>();

		await using var select = _fixture.Connection.CreateCommand();
		select.CommandText = "SELECT name FROM students.guardian_relationships;";
		await using var reader = await select.ExecuteReaderAsync(TestContext.Current.CancellationToken);
		while (await reader.ReadAsync(TestContext.Current.CancellationToken))
		{
			names.Add(reader.GetString(0));
		}

		return names;
	}

	private async Task<List<(string LessonType, string DurationType, string OccurrenceType)>> SelectLessonStructureCombinationsAsync()
	{
		var combinations = new List<(string, string, string)>();

		await using var select = _fixture.Connection.CreateCommand();
		select.CommandText = "SELECT lesson_type, duration_type, occurrence_type FROM students.lesson_structures;";
		await using var reader = await select.ExecuteReaderAsync(TestContext.Current.CancellationToken);
		while (await reader.ReadAsync(TestContext.Current.CancellationToken))
		{
			combinations.Add((reader.GetString(0), reader.GetString(1), reader.GetString(2)));
		}

		return combinations;
	}
}