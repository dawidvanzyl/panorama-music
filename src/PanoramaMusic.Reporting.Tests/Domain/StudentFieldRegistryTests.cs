using PanoramaMusic.Reporting.Domain.Registries;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Reporting.Tests.Domain;

public class StudentFieldRegistryTests
{
	private readonly StudentFieldRegistry _registry = new();

	[Fact]
	[Trait("AC", "317UC3")]
	public void Filters_TwentyOneAttributes_MatchTheRegistryContract()
	{
		_registry.Filters.Select(f => f.Key).ShouldBe(
		[
			"student.name",
			"student.grade",
			"student.phase",
			"student.class",
			"student.language",
			"student.hasSiblings",
			"student.isEldest",
			"guardian.name",
			"guardian.relationship",
			"guardian.receivesCorrespondence",
			"guardian.responsibleForPayment",
			"guardian.married",
			"course.courseType",
			"course.lessonType",
			"course.durationType",
			"course.occurrenceType",
			"course.instrumentType",
			"course.stepType",
			"course.teacher",
			"extraCurricular.activity",
			"extraCurricular.phase",
		]);
	}

	[Fact]
	[Trait("AC", "317UC3")]
	public void Columns_TwentyFourAttributes_MatchTheRegistryContract()
	{
		_registry.Columns.Select(c => c.Key).ShouldBe(
		[
			"student.name",
			"student.class",
			"student.phase",
			"student.language",
			"student.dateOfBirth",
			"student.hasSiblings",
			"student.numberOfSiblings",
			"student.isEldest",
			"guardian.name",
			"guardian.cell",
			"guardian.email",
			"guardian.receivesCorrespondence",
			"guardian.responsibleForPayment",
			"guardian.married",
			"course.courseType",
			"course.lessonType",
			"course.durationType",
			"course.occurrenceType",
			"course.teacher",
			"course.instrumentType",
			"course.stepType",
			"extraCurricular.activity",
			"extraCurricular.phase",
			"extraCurricular.practiceTimes",
		]);
	}

	[Fact]
	[Trait("AC", "318UC15")]
	public void Registry_NoKeyLabelOrHeaderMentionsBankingOrPrivateOrLinkedAccount_AndTeacherAttributeIsNameAndStatusOnly()
	{
		ShouldlyHelpers.Satisfy(
			() => _registry.Filters.ShouldNotContain(filter =>
				filter.Key.Contains("bank", StringComparison.OrdinalIgnoreCase)
				|| filter.Label.Contains("bank", StringComparison.OrdinalIgnoreCase)
				|| filter.Label.Contains("account", StringComparison.OrdinalIgnoreCase)
				|| filter.Label.Contains("branch", StringComparison.OrdinalIgnoreCase)
				|| filter.Label.Contains("private", StringComparison.OrdinalIgnoreCase)
				|| filter.Label.Contains("linked", StringComparison.OrdinalIgnoreCase)),
			() => _registry.Columns.ShouldNotContain(column =>
				column.Key.Contains("bank", StringComparison.OrdinalIgnoreCase)
				|| column.Header.Contains("bank", StringComparison.OrdinalIgnoreCase)
				|| column.Header.Contains("account", StringComparison.OrdinalIgnoreCase)
				|| column.Header.Contains("branch", StringComparison.OrdinalIgnoreCase)
				|| column.Header.Contains("private", StringComparison.OrdinalIgnoreCase)
				|| column.Header.Contains("linked", StringComparison.OrdinalIgnoreCase)),
			() => _registry.Filters.Count(filter => filter.Key.StartsWith("course.teacher", StringComparison.Ordinal)).ShouldBe(1),
			() => _registry.Columns.Count(column => column.Key.StartsWith("course.teacher", StringComparison.Ordinal)).ShouldBe(1));
	}

	[Fact]
	[Trait("AC", "317UC3")]
	public void Columns_OnlyStudentIsLocked()
	{
		_registry.Columns.Single(c => c.Locked).Key.ShouldBe("student.name");
	}

	[Fact]
	[Trait("AC", "317UC3")]
	public void TryGetFilter_UnknownKey_ReturnsNull()
	{
		_registry.TryGetFilter("student.bankAccount").ShouldBeNull();
	}

	[Fact]
	[Trait("AC", "317UC3")]
	public void TryGetColumn_UnknownKey_ReturnsNull()
	{
		_registry.TryGetColumn("teacher.bankAccountNumber").ShouldBeNull();
	}
}