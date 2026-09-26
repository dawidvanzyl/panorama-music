using Dapper;
using PanoramaMusic.Reporting.Domain.Enums;
using PanoramaMusic.Reporting.Domain.Registries;
using PanoramaMusic.Reporting.Domain.ValueObjects;
using PanoramaMusic.Reporting.Infrastructure.Sql;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Reporting.Tests.Infrastructure;

public class ReportPredicateComposerTests
{
	private readonly StudentFieldRegistry _registry = new();
	private readonly ReportPredicateComposer _composer = new(new StudentSqlCatalog());

	private static readonly IReadOnlyDictionary<ReportDatasource, IReadOnlyList<FieldOption>> _noDatasourceOptions =
		new Dictionary<ReportDatasource, IReadOnlyList<FieldOption>>();

	[Fact]
	[Trait("AC", "329UC1")]
	public void ComposePopulationPredicates_TwoGuardianFilters_OneExistsOverASingleGuardianRecordCarriesBoth()
	{
		var definition = ReportDefinition.Create(
			[
				new ReportFilterInput("guardian.married", "equals", ["Yes"]),
				new ReportFilterInput("guardian.receivesCorrespondence", "equals", ["Yes"]),
			],
			["student.name"],
			_registry,
			_noDatasourceOptions);

		var parameters = new DynamicParameters();
		var fragments = _composer.ComposePopulationPredicates(definition.Filters, parameters);

		var nonStudentFragments = fragments.Where(fragment => fragment.Sql.Contains("student_guardians")).ToList();

		ShouldlyHelpers.Satisfy(
			() => nonStudentFragments.Count.ShouldBe(1),
			() => CountOccurrences(nonStudentFragments[0].Sql, "students.student_guardians").ShouldBe(1),
			() => nonStudentFragments[0].Sql.ShouldContain("g.married"),
			() => nonStudentFragments[0].Sql.ShouldContain("g.receives_correspondence"));
	}

	[Fact]
	[Trait("AC", "329UC2")]
	public void ComposedSeparately_InterleavedFilters_PopulationExistsAndCollectionConditionMatch()
	{
		var definition = ReportDefinition.Create(
			[
				new ReportFilterInput("student.name", "contains", ["x"]),
				new ReportFilterInput("guardian.married", "equals", ["Yes"]),
				new ReportFilterInput("course.courseType", "equals", ["Theory"]),
				new ReportFilterInput("guardian.receivesCorrespondence", "equals", ["Yes"]),
				new ReportFilterInput("extraCurricular.phase", "in", ["Junior"]),
			],
			["student.name"],
			_registry,
			_noDatasourceOptions);

		var populationParameters = new DynamicParameters();
		var populationFragments = _composer.ComposePopulationPredicates(definition.Filters, populationParameters);

		foreach (var collection in new[] { ReportCollection.Guardian, ReportCollection.Course, ReportCollection.ExtraCurricular })
		{
			var collectionParameters = new DynamicParameters();
			var condition = _composer.ComposeRecordCondition(collection, definition.FiltersFor(collection), collectionParameters)!;

			var populationFragment = populationFragments.Single(fragment => fragment.Sql.Contains(condition));
			populationFragment.ShouldNotBeNull();

			foreach (var name in collectionParameters.ParameterNames)
			{
				populationParameters.ParameterNames.ShouldContain(name);
				BoundValueEquals(populationParameters.Get<object>(name), collectionParameters.Get<object>(name)).ShouldBeTrue();
			}
		}

		var guardianParameters = new DynamicParameters();
		var guardianCondition = _composer.ComposeRecordCondition(ReportCollection.Guardian, definition.FiltersFor(ReportCollection.Guardian), guardianParameters)!;

		ShouldlyHelpers.Satisfy(
			() => guardianCondition.ShouldContain("g.married"),
			() => guardianCondition.ShouldContain("g.receives_correspondence"));
	}

	[Fact]
	[Trait("AC", "329UC6")]
	public void CollectionSqlCompose_WithRecordCondition_ReferencesNoOtherCollectionsTables()
	{
		var guardianParameters = new DynamicParameters();
		var guardianCondition = _composer.ComposeRecordCondition(
			ReportCollection.Guardian, [new ReportFilter("guardian.married", FilterOperator.Equals, ["Yes"], ReportCollection.Guardian)], guardianParameters)!;
		var guardianSql = GuardianCollectionSql.Compose(guardianCondition);

		var courseParameters = new DynamicParameters();
		var courseCondition = _composer.ComposeRecordCondition(
			ReportCollection.Course, [new ReportFilter("course.courseType", FilterOperator.Equals, ["Theory"], ReportCollection.Course)], courseParameters)!;
		var courseSql = CourseCollectionSql.Compose(courseCondition);

		var extraCurricularParameters = new DynamicParameters();
		var extraCurricularCondition = _composer.ComposeRecordCondition(
			ReportCollection.ExtraCurricular,
			[new ReportFilter("extraCurricular.phase", FilterOperator.Equals, ["Junior"], ReportCollection.ExtraCurricular)],
			extraCurricularParameters)!;
		var extraCurricularSql = ExtraCurricularCollectionSql.Compose(extraCurricularCondition);

		ShouldlyHelpers.Satisfy(
			() => guardianSql.ShouldNotContain("student_courses"),
			() => guardianSql.ShouldNotContain("student_extra_curriculars"),
			() => courseSql.ShouldNotContain("student_guardians"),
			() => courseSql.ShouldNotContain("student_extra_curriculars"),
			() => extraCurricularSql.ShouldNotContain("student_guardians"),
			() => extraCurricularSql.ShouldNotContain("student_courses"));
	}

	private static bool BoundValueEquals(object? left, object? right)
	{
		return left is Array leftArray && right is Array rightArray
			? leftArray.Cast<object>().SequenceEqual(rightArray.Cast<object>())
			: Equals(left, right);
	}

	private static int CountOccurrences(string haystack, string needle)
	{
		var count = 0;
		var index = 0;
		while ((index = haystack.IndexOf(needle, index, StringComparison.Ordinal)) >= 0)
		{
			count++;
			index += needle.Length;
		}

		return count;
	}
}