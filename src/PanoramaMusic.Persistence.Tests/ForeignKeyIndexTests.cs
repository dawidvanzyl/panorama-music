using Microsoft.Extensions.DependencyInjection;
using PanoramaMusic.Persistence.Tests.Fixtures;
using PanoramaMusic.Persistence.Tests.Repository;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Persistence.Tests;

/// <summary>
/// Guards against a foreign key being introduced without a supporting index.
/// Derives both the foreign-key list and the index list from the database
/// catalogue, so it needs no edit when a table is added — see issue #219.
/// </summary>
public class ForeignKeyIndexTests : IClassFixture<UnitOfWorkDatabaseFixture>
{
	private readonly ForeignKeyIndexTestReader _reader;

	public ForeignKeyIndexTests(UnitOfWorkDatabaseFixture fixture)
	{
		var context = fixture.CreateContext();
		_reader = context.ServiceProvider.GetRequiredService<ForeignKeyIndexTestReader>();
	}

	[Theory]
	[InlineData("students")]
	[InlineData("identity")]
	[Trait("AC", "219UC1")]
	public async Task GivenTheMigratedDatabase_WhenEnumeratingForeignKeyColumnsFromTheCatalogue_ThenEachIsTheLeadingColumnOfAnIndex(string schema)
	{
		var cancellationToken = TestContext.Current.CancellationToken;

		var unindexed = await _reader.FindUnindexedForeignKeyColumnsAsync(schema, cancellationToken);

		unindexed.ShouldBeEmpty(
			$"unindexed foreign-key column(s): {string.Join(", ", unindexed.Select(c => $"{c.Table}.{c.Column}"))}");
	}

	[Fact]
	[Trait("AC", "219UC2")]
	public async Task GivenAForeignKeyColumnCoveredOnlyAsTheTrailingColumnOfACompositeIndex_WhenTheGuardEvaluatesIt_ThenItIsReportedAsUnindexed()
	{
		var cancellationToken = TestContext.Current.CancellationToken;

		await _reader.ExecuteAsync(
			"""
			CREATE SCHEMA IF NOT EXISTS fk_guard_test;

			CREATE TABLE fk_guard_test.parent_a (id UUID PRIMARY KEY);
			CREATE TABLE fk_guard_test.parent_b (id UUID PRIMARY KEY);

			CREATE TABLE fk_guard_test.child (
			    parent_a_id UUID NOT NULL REFERENCES fk_guard_test.parent_a(id),
			    parent_b_id UUID NOT NULL REFERENCES fk_guard_test.parent_b(id),
			    PRIMARY KEY (parent_a_id, parent_b_id)
			);
			""",
			cancellationToken);

		try
		{
			var unindexed = await _reader.FindUnindexedForeignKeyColumnsAsync("fk_guard_test", cancellationToken);

			unindexed.ShouldContain(("child", "parent_b_id"));
		}
		finally
		{
			await _reader.ExecuteAsync("DROP SCHEMA fk_guard_test CASCADE;", cancellationToken);
		}
	}
}