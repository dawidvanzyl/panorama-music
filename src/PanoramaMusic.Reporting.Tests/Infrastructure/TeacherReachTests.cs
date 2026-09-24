using Dapper;
using PanoramaMusic.Reporting.Infrastructure.Sql;
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

	[Fact]
	[Trait("AC", "318UC15")]
	public void TeacherAliasedColumns_InCourseCollectionSqlAndGetTeacherNames_AreAllInTheAllowlist()
	{
		var courseColumns = TeacherAliasedColumns(CourseCollectionSql.Query);
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
		var parameters = new DynamicParameters();
		var predicateFragments = catalog.PredicateKeys
			.Select((pair, index) => catalog.TryGetPredicateBuilder(pair.Field, pair.Operator)!(
				$"f{index}", parameters, [Guid.NewGuid().ToString()]).Sql)
			.ToList();

		var haystacks = new List<string>
		{
			GuardianCollectionSql.Query,
			CourseCollectionSql.Query,
			ExtraCurricularCollectionSql.Query,
			GetTeacherNamesFunctionSql(),
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
