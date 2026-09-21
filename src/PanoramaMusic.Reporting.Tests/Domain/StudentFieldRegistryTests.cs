using PanoramaMusic.Reporting.Domain.Registries;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Reporting.Tests.Domain;

public class StudentFieldRegistryTests
{
	private readonly StudentFieldRegistry _registry = new();

	[Fact]
	[Trait("AC", "317UC3")]
	public void Filters_SevenAttributes_DeclaredVerbatimFromTheIssue()
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
		]);
	}

	[Fact]
	[Trait("AC", "317UC3")]
	public void Columns_EightAttributes_DeclaredVerbatimFromTheIssue()
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
		]);
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
