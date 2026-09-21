using PanoramaMusic.Reporting.Domain.Formats;
using PanoramaMusic.Reporting.Domain.ValueObjects;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Reporting.Tests.Domain;

public class ColumnFormatTests
{
	private static SourceValues Sources(params (string Key, object? Value)[] values) =>
		new(values.ToDictionary(v => v.Key, v => v.Value));

	[Theory]
	[Trait("AC", "317UC7")]
	[InlineData("Grade4", "A2", "4A2")]
	[InlineData("Private", null, "Private")]
	public void ClassFormat_GradeAndClass_FormatsAsExpected(string grade, string? studentClass, string expected)
	{
		var format = new ClassFormat("grade", "class");

		format.Format(Sources(("grade", grade), ("class", studentClass))).ShouldBe(expected);
	}

	[Fact]
	[Trait("AC", "317UC8")]
	public void PhaseFormat_PrivateGradeWithPhaseRecorded_IsBlank()
	{
		var format = new PhaseFormat("grade", "phase");

		format.Format(Sources(("grade", "Private"), ("phase", "Junior"))).ShouldBe(string.Empty);
	}

	[Fact]
	[Trait("AC", "317UC8")]
	public void PhaseFormat_NonPrivateGrade_RendersThePhase()
	{
		var format = new PhaseFormat("grade", "phase");

		format.Format(Sources(("grade", "Grade4"), ("phase", "Junior"))).ShouldBe("Junior");
	}

	[Fact]
	[Trait("AC", "317UC9")]
	public void HasSiblingAndNumberOfSiblingsAndEldest_TwoSiblingsOneOlder_RenderYesTwoNo()
	{
		var hasSibling = new CountPositiveFormat("siblingCount");
		var numberOfSiblings = new CountFormat("siblingCount");
		var eldest = new YesNoFormat("isEldest");

		var sources = Sources(("siblingCount", 2), ("isEldest", false));

		ShouldlyHelpers.Satisfy(
			() => hasSibling.Format(sources).ShouldBe("Yes"),
			() => numberOfSiblings.Format(sources).ShouldBe("2"),
			() => eldest.Format(sources).ShouldBe("No"));
	}

	[Fact]
	[Trait("AC", "317UC10")]
	public void DateFormat_TwelfthMarch2016_RendersIsoDate()
	{
		var format = new DateFormat("dateOfBirth");

		format.Format(Sources(("dateOfBirth", new DateOnly(2016, 3, 12)))).ShouldBe("2016-03-12");
	}
}
