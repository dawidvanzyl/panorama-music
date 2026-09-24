using PanoramaMusic.Reporting.Domain.Enums;
using PanoramaMusic.Reporting.Domain.Services;
using PanoramaMusic.Reporting.Domain.ValueObjects;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Reporting.Tests.Domain;

public class CollectionRecordOrderingTests
{
	private static CollectionRecord Guardian(Guid guardianId) =>
		new(Guid.NewGuid(), new SourceValues(new Dictionary<string, object?> { ["guardianId"] = guardianId }));

	private static CollectionRecord Course(
		string courseType, string lessonType, string durationType, string occurrenceType, string? instrumentType, string? stepType, Guid studentCourseId) =>
		new(Guid.NewGuid(), new SourceValues(new Dictionary<string, object?>
		{
			["courseType"] = courseType,
			["lessonType"] = lessonType,
			["durationType"] = durationType,
			["occurrenceType"] = occurrenceType,
			["instrumentType"] = instrumentType,
			["stepType"] = stepType,
			["studentCourseId"] = studentCourseId,
		}));

	private static CollectionRecord Activity(string activity, Guid extraCurricularId) =>
		new(Guid.NewGuid(), new SourceValues(new Dictionary<string, object?> { ["activity"] = activity, ["extraCurricularId"] = extraCurricularId }));

	[Fact]
	[Trait("AC", "318UC8")]
	public void Sort_Guardian_OrdersByGuardianIdAscending()
	{
		var high = Guardian(Guid.Parse("ffffffff-ffff-ffff-ffff-ffffffffffff"));
		var low = Guardian(Guid.Parse("00000000-0000-0000-0000-000000000000"));

		var sorted = CollectionRecordOrdering.Sort(ReportCollection.Guardian, [high, low]);

		sorted.ShouldBe([low, high]);
	}

	[Fact]
	[Trait("AC", "318UC8")]
	public void Sort_Course_OrdersByContractOptionOrder()
	{
		var theory = Course("Theory", "Group", "Hour", "DuringSchool", null, "Step1A", Guid.NewGuid());
		var instrument = Course("Instrument", "Individual", "HalfHour", "DuringSchool", "Piano", "Step1A", Guid.NewGuid());

		var sorted = CollectionRecordOrdering.Sort(ReportCollection.Course, [instrument, theory]);

		sorted.ShouldBe([theory, instrument]);
	}

	[Fact]
	[Trait("AC", "318UC8")]
	public void Sort_ExtraCurricular_OrdersByActivityAToZ()
	{
		var zeta = Activity("Zeta", Guid.NewGuid());
		var art = Activity("Art", Guid.NewGuid());

		var sorted = CollectionRecordOrdering.Sort(ReportCollection.ExtraCurricular, [zeta, art]);

		sorted.ShouldBe([art, zeta]);
	}
}
