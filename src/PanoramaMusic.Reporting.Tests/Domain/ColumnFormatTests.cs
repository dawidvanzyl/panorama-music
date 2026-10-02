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

	[Fact]
	[Trait("AC", "318UC9")]
	public void GuardianNameFormat_SiphoVanZylFather_RendersJoinedWithRelationship()
	{
		var format = new GuardianNameFormat("firstName", "surname", "relationship");

		var sources = Sources(("firstName", "Sipho"), ("surname", "van Zyl"), ("relationship", "Father"));

		format.Format(sources).ShouldBe("Sipho van Zyl · Father");
	}

	[Fact]
	[Trait("AC", "318UC10")]
	public void TeacherFormat_ActiveInactiveAndRemoved_RenderTheThreeShapes()
	{
		var format = new TeacherFormat("teacherFirstName", "teacherSurname", "teacherIsActive", "teacherExists");

		var active = Sources(("teacherFirstName", "Amy"), ("teacherSurname", "Jacobs"), ("teacherIsActive", true), ("teacherExists", true));
		var inactive = Sources(("teacherFirstName", "Ben"), ("teacherSurname", "Smith"), ("teacherIsActive", false), ("teacherExists", true));
		var removed = Sources(("teacherExists", false));

		ShouldlyHelpers.Satisfy(
			() => format.Format(active).ShouldBe("Amy Jacobs"),
			() => format.Format(inactive).ShouldBe("Ben Smith (inactive)"),
			() => format.Format(removed).ShouldBe("(removed)"));
	}

	[Fact]
	[Trait("AC", "318UC11")]
	public void InstrumentTypeAndStepTypeFormat_TheoryAndGREnrichmentAndInstrument_BlankOrRender()
	{
		var instrumentFormat = new InstrumentTypeFormat("courseType", "instrumentType");
		var stepFormat = new StepTypeFormat("courseType", "stepType");

		var theory = Sources(("courseType", "Theory"), ("instrumentType", null), ("stepType", "Step2A"));
		var grEnrichment = Sources(("courseType", "GREEnrichment"), ("instrumentType", null), ("stepType", null));
		var instrument = Sources(("courseType", "Instrument"), ("instrumentType", "Piano"), ("stepType", "Other"));

		ShouldlyHelpers.Satisfy(
			() => instrumentFormat.Format(theory).ShouldBe(string.Empty),
			() => stepFormat.Format(theory).ShouldBe("2A"),
			() => instrumentFormat.Format(grEnrichment).ShouldBe(string.Empty),
			() => stepFormat.Format(grEnrichment).ShouldBe(string.Empty),
			() => instrumentFormat.Format(instrument).ShouldBe("Piano"),
			() => stepFormat.Format(instrument).ShouldBe("Other"));
	}

	[Fact]
	[Trait("AC", "318UC12")]
	public void PracticeTimesFormat_WednesdayAndMonday_SortsMondayFirst()
	{
		var format = new PracticeTimesFormat("practiceDays", "practiceStartTimes");

		var sources = Sources(
			("practiceDays", new[] { "Wednesday", "Monday" }),
			("practiceStartTimes", new[] { new TimeOnly(15, 0), new TimeOnly(14, 0) }));

		format.Format(sources).ShouldBe("Monday 14:00 · Wednesday 15:00");
	}

	[Fact]
	[Trait("AC", "318UC13")]
	public void OptionLabelFormat_GREEnrichmentHalfHourDuringSchool_RenderContractLabels()
	{
		var courseTypeFormat = new OptionLabelFormat("courseType", PanoramaMusic.Reporting.Domain.Registries.StudentFieldRegistry.CourseTypeOptions);
		var durationFormat = new OptionLabelFormat("durationType", PanoramaMusic.Reporting.Domain.Registries.StudentFieldRegistry.DurationTypeOptions);
		var occurrenceFormat = new OptionLabelFormat("occurrenceType", PanoramaMusic.Reporting.Domain.Registries.StudentFieldRegistry.OccurrenceTypeOptions);

		var sources = Sources(
			("courseType", "GREEnrichment"),
			("durationType", "HalfHour"),
			("occurrenceType", "DuringSchool"));

		ShouldlyHelpers.Satisfy(
			() => courseTypeFormat.Format(sources).ShouldBe("GR Enrichment"),
			() => durationFormat.Format(sources).ShouldBe("Half Hour"),
			() => occurrenceFormat.Format(sources).ShouldBe("During School"));
	}
}