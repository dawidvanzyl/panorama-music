using PanoramaMusic.Reporting.Domain.Entities;
using PanoramaMusic.Reporting.Domain.Enums;
using PanoramaMusic.Reporting.Domain.Events;
using PanoramaMusic.Reporting.Domain.Exceptions;
using PanoramaMusic.Reporting.Domain.Registries;
using PanoramaMusic.Reporting.Domain.ValueObjects;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Reporting.Tests.Domain;

public class SavedReportTests
{
	private static readonly StudentFieldRegistry _registry = new();

	private static readonly IReadOnlyDictionary<ReportDatasource, IReadOnlyList<FieldOption>> _noDatasourceOptions =
		new Dictionary<ReportDatasource, IReadOnlyList<FieldOption>>();

	private static ReportDefinition CreateDefinition() =>
		ReportDefinition.Create([], ["student.name"], _registry, _noDatasourceOptions);

	[Theory]
	[Trait("AC", "321UC1")]
	[InlineData("")]
	[InlineData("   ")]
	public void Create_BlankOrWhitespaceName_ThrowsInvalidSavedReportException(string name)
	{
		Should.Throw<InvalidSavedReportException>(
			() => SavedReport.Create(Guid.NewGuid(), name, CreateDefinition(), Guid.NewGuid(), DateTime.UtcNow));
	}

	[Fact]
	[Trait("AC", "321UC1")]
	public void Create_NameLongerThan100Characters_ThrowsInvalidSavedReportException()
	{
		var name = new string('a', 101);

		Should.Throw<InvalidSavedReportException>(
			() => SavedReport.Create(Guid.NewGuid(), name, CreateDefinition(), Guid.NewGuid(), DateTime.UtcNow));
	}

	[Fact]
	[Trait("AC", "321UC1")]
	public void Create_NameOfExactly100Characters_IsAccepted()
	{
		var name = new string('a', 100);

		var report = SavedReport.Create(Guid.NewGuid(), name, CreateDefinition(), Guid.NewGuid(), DateTime.UtcNow);

		report.Name.ShouldBe(name);
	}

	[Fact]
	[Trait("AC", "321UC1")]
	public void Create_NamePaddedWithSpaces_StoresItTrimmed()
	{
		var report = SavedReport.Create(Guid.NewGuid(), "  Grade 4 Contacts  ", CreateDefinition(), Guid.NewGuid(), DateTime.UtcNow);

		report.Name.ShouldBe("Grade 4 Contacts");
	}

	[Fact]
	[Trait("AC", "321UC8")]
	public void Create_ValidNameAndDefinition_RaisesExactlyOneSavedReportCreatedCarryingIdNameDefinitionAndCreator()
	{
		var savedReportId = Guid.NewGuid();
		var createdBy = Guid.NewGuid();
		var definition = CreateDefinition();

		var report = SavedReport.Create(savedReportId, "  Grade 4 Contacts  ", definition, createdBy, DateTime.UtcNow);

		var domainEvent = report.DrainEvents().ShouldHaveSingleItem().ShouldBeOfType<SavedReportCreated>();
		var expectedDefinition = StoredReportDefinition.From(definition);
		domainEvent.SavedReportId.ShouldBe(savedReportId);
		domainEvent.Name.ShouldBe("Grade 4 Contacts");
		domainEvent.Definition.Columns.ShouldBe(expectedDefinition.Columns);
		domainEvent.Definition.Filters.ShouldBeEmpty();
		domainEvent.CreatedBy.ShouldBe(createdBy);
	}

	[Fact]
	[Trait("AC", "321UC10")]
	public void RecordRun_SetsLastRunAt_AndRaisesNoDomainEvent()
	{
		var report = SavedReport.Create(Guid.NewGuid(), "Grade 4 Contacts", CreateDefinition(), Guid.NewGuid(), DateTime.UtcNow);
		report.DrainEvents();
		var ranAt = DateTime.UtcNow;

		report.RecordRun(ranAt);

		report.LastRunAt.ShouldBe(ranAt);
		report.DrainEvents().ShouldBeEmpty();
	}
}
