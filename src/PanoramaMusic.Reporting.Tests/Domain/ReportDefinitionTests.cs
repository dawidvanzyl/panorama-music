using PanoramaMusic.Reporting.Domain.Exceptions;
using PanoramaMusic.Reporting.Domain.Registries;
using PanoramaMusic.Reporting.Domain.ValueObjects;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Reporting.Tests.Domain;

public class ReportDefinitionTests
{
	private readonly StudentFieldRegistry _registry = new();

	private static readonly string[] _studentOnly = ["student.name"];

	[Fact]
	[Trait("AC", "317UC1")]
	public void Create_FilterNamesUnknownField_ThrowsInvalidReportDefinitionException()
	{
		var filters = new[] { new ReportFilterInput("student.unknown", "equals", ["x"]) };

		Should.Throw<InvalidReportDefinitionException>(() => ReportDefinition.Create(filters, _studentOnly, _registry));
	}

	[Fact]
	[Trait("AC", "317UC2")]
	public void Create_ColumnNamesUnknownKey_ThrowsInvalidReportDefinitionException()
	{
		var columns = new[] { "student.name", "student.unknown" };

		Should.Throw<InvalidReportDefinitionException>(() => ReportDefinition.Create([], columns, _registry));
	}

	[Fact]
	[Trait("AC", "317UC3")]
	public void Create_EveryRegistryAttributeDeclaresItsShape_AndNoBankingAttributeIsPresent()
	{
		ShouldlyHelpers.Satisfy(
			() => _registry.Filters.ShouldAllBe(filter => filter.Operators.Count > 0),
			() => _registry.Columns.ShouldAllBe(column => column.Sources.Count > 0),
			() => _registry.Filters.ShouldNotContain(filter =>
				filter.Key.Contains("bank", StringComparison.OrdinalIgnoreCase)
				|| filter.Label.Contains("bank", StringComparison.OrdinalIgnoreCase)
				|| filter.Label.Contains("account", StringComparison.OrdinalIgnoreCase)
				|| filter.Label.Contains("branch", StringComparison.OrdinalIgnoreCase)),
			() => _registry.Columns.ShouldNotContain(column =>
				column.Key.Contains("bank", StringComparison.OrdinalIgnoreCase)
				|| column.Header.Contains("bank", StringComparison.OrdinalIgnoreCase)
				|| column.Header.Contains("account", StringComparison.OrdinalIgnoreCase)
				|| column.Header.Contains("branch", StringComparison.OrdinalIgnoreCase)));
	}

	[Fact]
	[Trait("AC", "317UC4")]
	public void Create_ContainsOperatorOnGrade_IsRejectedAsInvalidOperator()
	{
		var filters = new[] { new ReportFilterInput("student.grade", "contains", ["Grade4"]) };

		Should.Throw<InvalidReportDefinitionException>(() => ReportDefinition.Create(filters, _studentOnly, _registry));
	}

	[Fact]
	[Trait("AC", "317UC5")]
	public void Create_ListValueOutsideOptions_ThrowsInvalidReportDefinitionException()
	{
		var filters = new[] { new ReportFilterInput("student.grade", "equals", ["Grade99"]) };

		Should.Throw<InvalidReportDefinitionException>(() => ReportDefinition.Create(filters, _studentOnly, _registry));
	}

	[Fact]
	[Trait("AC", "317UC5")]
	public void Create_EmptyFilterValue_ThrowsInvalidReportDefinitionException()
	{
		var filters = new[] { new ReportFilterInput("student.name", "contains", []) };

		Should.Throw<InvalidReportDefinitionException>(() => ReportDefinition.Create(filters, _studentOnly, _registry));
	}

	[Fact]
	[Trait("AC", "317UC5")]
	public void Create_WhitespaceOnlyFilterValue_ThrowsInvalidReportDefinitionException()
	{
		var filters = new[] { new ReportFilterInput("student.name", "contains", ["   "]) };

		Should.Throw<InvalidReportDefinitionException>(() => ReportDefinition.Create(filters, _studentOnly, _registry));
	}

	[Fact]
	[Trait("AC", "317UC5")]
	public void Create_EqualsWithTwoValues_ThrowsInvalidReportDefinitionException()
	{
		var filters = new[] { new ReportFilterInput("student.grade", "equals", ["Grade4", "Grade5"]) };

		Should.Throw<InvalidReportDefinitionException>(() => ReportDefinition.Create(filters, _studentOnly, _registry));
	}

	[Fact]
	[Trait("AC", "317UC5")]
	public void Create_ContainsWithTwoValues_ThrowsInvalidReportDefinitionException()
	{
		var filters = new[] { new ReportFilterInput("student.name", "contains", ["a", "b"]) };

		Should.Throw<InvalidReportDefinitionException>(() => ReportDefinition.Create(filters, _studentOnly, _registry));
	}

	[Fact]
	[Trait("AC", "317UC-bug5")]
	public void Create_BooleanEqualsWithBlankAndValidValue_StoresOnlyTheNonBlankValue()
	{
		// review-1 Blocker 2 (#317): the raw values, including the blank,
		// used to flow into ReportFilter unchanged even though validation
		// itself ran on the non-blank subset. A predicate builder always
		// reads values[0], so a leading blank silently became the bound
		// value ("" == "Yes" -> false, running Has Sibling = No instead of
		// Yes) with no rejection at all.
		var filters = new[] { new ReportFilterInput("student.hasSiblings", "equals", ["", "Yes"]) };

		var definition = ReportDefinition.Create(filters, _studentOnly, _registry);

		definition.Filters.Single().Values.ShouldBe(["Yes"]);
	}

	[Fact]
	[Trait("AC", "317UC-bug5")]
	public void Create_ListEqualsWithBlankAndValidValue_StoresOnlyTheNonBlankValue()
	{
		var filters = new[] { new ReportFilterInput("student.grade", "equals", ["", "Grade4"]) };

		var definition = ReportDefinition.Create(filters, _studentOnly, _registry);

		definition.Filters.Single().Values.ShouldBe(["Grade4"]);
	}

	[Fact]
	[Trait("AC", "317UC6")]
	public void Create_ColumnSetMissingStudent_ThrowsInvalidReportDefinitionException()
	{
		Should.Throw<InvalidReportDefinitionException>(() => ReportDefinition.Create([], ["student.class"], _registry));
	}

	[Fact]
	[Trait("AC", "317UC6")]
	public void Create_DuplicateColumnKey_ThrowsInvalidReportDefinitionException()
	{
		Should.Throw<InvalidReportDefinitionException>(() =>
			ReportDefinition.Create([], ["student.name", "student.class", "student.class"], _registry));
	}

	[Fact]
	[Trait("AC", "317UC6")]
	public void Create_ElevenColumns_ThrowsInvalidReportDefinitionException()
	{
		// The count cap is checked on the raw request before any key is
		// resolved (see ReportDefinition.Create), so this is rejected as "too
		// many columns" even though the #317 registry itself only has 8 keys.
		var columns = Enumerable.Range(0, 11).Select(i => $"student.name{i}").ToArray();

		Should.Throw<InvalidReportDefinitionException>(() => ReportDefinition.Create([], columns, _registry));
	}

	[Fact]
	[Trait("AC", "317UC6")]
	public void Create_ValidColumns_AreReturnedInDisplayOrder()
	{
		var definition = ReportDefinition.Create([], ["student.isEldest", "student.class", "student.name"], _registry);

		definition.Columns.Select(c => c.Key).ShouldBe(["student.name", "student.class", "student.isEldest"]);
	}
}