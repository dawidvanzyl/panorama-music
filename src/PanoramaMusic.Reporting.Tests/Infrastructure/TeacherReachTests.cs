using PanoramaMusic.Reporting.Domain.Enums;
using PanoramaMusic.Reporting.Infrastructure.Sql;
using PanoramaMusic.Teachers.Infrastructure.Persistence;
using Shouldly;
using System.Text.RegularExpressions;
using Xunit;

namespace PanoramaMusic.Reporting.Tests.Infrastructure;

/// <summary>
/// 318UC15: nothing beyond a teacher's name and active status is reachable
/// from the Teachers context — neither through Reporting's own SQL nor
/// through the narrow function it reads live options from.
/// </summary>
public class TeacherReachTests
{
	private static readonly string[] _allowedTeacherColumns = ["teacher_id", "first_name", "surname", "is_active"];
	private static readonly string[] _forbiddenTokens = ["banking_details", "is_private", "linked_account_id"];

	[Fact]
	[Trait("AC", "318UC15")]
	public void CourseCollectionSql_EveryTeacherAliasedColumn_IsInTheAllowlist()
	{
		var teacherColumns = Regex.Matches(CourseCollectionSql.Query, @"\bt\.(\w+)")
			.Select(match => match.Groups[1].Value)
			.Distinct()
			.ToList();

		teacherColumns.ShouldNotBeEmpty();
		teacherColumns.ShouldAllBe(column => _allowedTeacherColumns.Contains(column));
	}

	[Fact]
	[Trait("AC", "318UC15")]
	public void ReportingSql_ContainsNoForbiddenTeacherToken()
	{
		var catalog = new StudentSqlCatalog();
		var teacherEquals = catalog.TryGetPredicateBuilder("course.teacher", FilterOperator.Equals)!;
		var teacherIn = catalog.TryGetPredicateBuilder("course.teacher", FilterOperator.In)!;
		var parameters = new Dapper.DynamicParameters();

		var predicateSql = string.Join(
			" ",
			teacherEquals("f0", parameters, [Guid.NewGuid().ToString()]).Sql,
			teacherIn("f1", parameters, [Guid.NewGuid().ToString()]).Sql);

		var haystacks = new[]
		{
			GuardianCollectionSql.Query,
			CourseCollectionSql.Query,
			ExtraCurricularCollectionSql.Query,
			predicateSql,
			GetTeacherNamesFunctionSql(),
		};

		foreach (var haystack in haystacks)
		{
			var lowered = haystack.ToLowerInvariant();
			foreach (var forbidden in _forbiddenTokens)
			{
				lowered.ShouldNotContain(forbidden);
			}
		}
	}

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
