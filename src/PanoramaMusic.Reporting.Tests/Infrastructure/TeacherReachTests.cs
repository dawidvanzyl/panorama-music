using Dapper;
using PanoramaMusic.Reporting.Domain.Enums;
using PanoramaMusic.Reporting.Domain.Registries;
using PanoramaMusic.Reporting.Domain.ValueObjects;
using PanoramaMusic.Reporting.Infrastructure.Sql;
using PanoramaMusic.Reporting.Infrastructure.Sql.Predicates;
using PanoramaMusic.Teachers.Infrastructure.Persistence;
using Shouldly;
using System.Text.RegularExpressions;
using Xunit;

namespace PanoramaMusic.Reporting.Tests.Infrastructure;

/// <summary>
/// Nothing beyond a teacher's name and active status is reachable from the
/// Teachers context — neither through Reporting's own SQL nor through the
/// narrow function it reads live options from.
/// </summary>
public class TeacherReachTests
{
	private static readonly string[] _allowedTeacherColumns = ["teacher_id", "first_name", "surname", "is_active"];
	private static readonly string[] _forbiddenTokens = ["banking_details", "is_private", "linked_account_id"];
	private static readonly StudentFieldRegistry _registry = new();

	[Fact]
	[Trait("AC", "318UC15")]
	public void TeacherAliasedColumns_InCourseCollectionSqlAndGetTeacherNames_AreAllInTheAllowlist()
	{
		var composer = new ReportPredicateComposer(new StudentSqlCatalog());
		var condition = composer.ComposeRecordCondition(ReportCollection.Course, FiltersFor(ReportCollection.Course), new DynamicParameters());

		var courseColumns = TeacherAliasedColumns(CourseCollectionSql.Query)
			.Concat(TeacherAliasedColumns(CourseCollectionSql.Compose(condition)))
			.Distinct()
			.ToList();
		var functionColumns = TeacherAliasedColumns(GetTeacherNamesFunctionSql());

		ShouldlyHelpers.Satisfy(
			() => courseColumns.ShouldNotBeEmpty(),
			() => courseColumns.ShouldAllBe(column => _allowedTeacherColumns.Contains(column)),
			() => functionColumns.ShouldNotBeEmpty(),
			() => functionColumns.ShouldAllBe(column => _allowedTeacherColumns.Contains(column)));
	}

	[Fact]
	[Trait("AC", "318UC15")]
	public void ReportingSql_ContainsNoForbiddenTeacherToken()
	{
		var catalog = new StudentSqlCatalog();
		var composer = new ReportPredicateComposer(catalog);
		var parameters = new DynamicParameters();
		var predicateFragments = catalog.PredicateKeys
			.Select((pair, index) => catalog.TryGetPredicateBuilder(pair.Field, pair.Operator)!(
				$"f{index}", parameters, [Guid.NewGuid().ToString()]).Sql)
			.ToList();

		var guardianCondition = composer.ComposeRecordCondition(ReportCollection.Guardian, FiltersFor(ReportCollection.Guardian), new DynamicParameters());
		var courseCondition = composer.ComposeRecordCondition(ReportCollection.Course, FiltersFor(ReportCollection.Course), new DynamicParameters());
		var extraCurricularCondition = composer.ComposeRecordCondition(
			ReportCollection.ExtraCurricular, FiltersFor(ReportCollection.ExtraCurricular), new DynamicParameters());

		var haystacks = new List<string>
		{
			GuardianCollectionSql.Query,
			CourseCollectionSql.Query,
			ExtraCurricularCollectionSql.Query,
			GetTeacherNamesFunctionSql(),
			GuardianCollectionSql.Compose(guardianCondition),
			CourseCollectionSql.Compose(courseCondition),
			ExtraCurricularCollectionSql.Compose(extraCurricularCondition),
			GuardianPredicates.Scope.From,
			CoursePredicates.Scope.From,
			ExtraCurricularPredicates.Scope.From,
		};
		haystacks.AddRange(predicateFragments);

		foreach (var haystack in haystacks)
		{
			var lowered = haystack.ToLowerInvariant();
			foreach (var forbidden in _forbiddenTokens)
			{
				lowered.ShouldNotContain(forbidden);
			}
		}
	}

	private static IReadOnlyList<ReportFilter> FiltersFor(ReportCollection collection) =>
		[.. _registry.Filters
			.Where(filter => filter.Collection == collection)
			.Select(filter => new ReportFilter(filter.Key, filter.Operators[0], [Guid.NewGuid().ToString()], collection))];

	private static List<string> TeacherAliasedColumns(string sql) =>
		[.. Regex.Matches(sql, @"\bt\.(\w+)").Select(match => match.Groups[1].Value).Distinct()];

	private static string GetTeacherNamesFunctionSql()
	{
		var assembly = typeof(TeacherMigrator).Assembly;
		var resourceName = assembly.GetManifestResourceNames()
			.Single(name => name.EndsWith("get_teacher_names.sql", StringComparison.Ordinal));

		using var stream = assembly.GetManifestResourceStream(resourceName)!;
		using var reader = new StreamReader(stream);
		return reader.ReadToEnd();
	}
}