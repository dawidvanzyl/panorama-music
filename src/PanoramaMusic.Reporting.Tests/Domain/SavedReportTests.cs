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

	[Fact]
	[Trait("AC", "322UC1")]
	public void Update_ByCreator_ReplacesNameAndDefinitionAndLeavesCreatorCreatedAtLastRunAtUnchanged()
	{
		var createdBy = Guid.NewGuid();
		var createdAt = DateTime.UtcNow;
		var report = SavedReport.Create(Guid.NewGuid(), "Grade 4 Contacts", CreateDefinition(), createdBy, createdAt);
		report.DrainEvents();
		var newDefinition = ReportDefinition.Create([], ["student.name", "student.class"], _registry, _noDatasourceOptions);

		report.Update(createdBy, "  Grade 5 Contacts  ", newDefinition);

		ShouldlyHelpers.Satisfy(
			() => report.Name.ShouldBe("Grade 5 Contacts"),
			() => report.Definition.Columns.ShouldBe(StoredReportDefinition.From(newDefinition).Columns),
			() => report.CreatedBy.ShouldBe(createdBy),
			() => report.CreatedAt.ShouldBe(createdAt),
			() => report.LastRunAt.ShouldBeNull());
	}

	[Fact]
	[Trait("AC", "322UC2")]
	public void Update_ByNonCreator_ThrowsForbiddenExceptionAndLeavesReportUnchanged()
	{
		var createdBy = Guid.NewGuid();
		var report = SavedReport.Create(Guid.NewGuid(), "Grade 4 Contacts", CreateDefinition(), createdBy, DateTime.UtcNow);
		report.DrainEvents();

		Should.Throw<ForbiddenException>(() => report.Update(Guid.NewGuid(), "Hijacked", CreateDefinition()));

		report.Name.ShouldBe("Grade 4 Contacts");
		report.DrainEvents().ShouldBeEmpty();
	}

	[Fact]
	[Trait("AC", "322UC3")]
	public void Delete_ByCreator_Succeeds()
	{
		var createdBy = Guid.NewGuid();
		var report = SavedReport.Create(Guid.NewGuid(), "Grade 4 Contacts", CreateDefinition(), createdBy, DateTime.UtcNow);
		report.DrainEvents();

		Should.NotThrow(() => report.Delete(createdBy));
	}

	[Fact]
	[Trait("AC", "322UC4")]
	public void Delete_ByNonCreator_ThrowsForbiddenExceptionAndRaisesNothing()
	{
		var createdBy = Guid.NewGuid();
		var report = SavedReport.Create(Guid.NewGuid(), "Grade 4 Contacts", CreateDefinition(), createdBy, DateTime.UtcNow);
		report.DrainEvents();

		Should.Throw<ForbiddenException>(() => report.Delete(Guid.NewGuid()));

		report.DrainEvents().ShouldBeEmpty();
	}

	[Theory]
	[Trait("AC", "322UC6")]
	[InlineData("")]
	[InlineData("   ")]
	public void Update_BlankOrWhitespaceName_ThrowsInvalidSavedReportExceptionAndLeavesReportUnchanged(string name)
	{
		var createdBy = Guid.NewGuid();
		var report = SavedReport.Create(Guid.NewGuid(), "Grade 4 Contacts", CreateDefinition(), createdBy, DateTime.UtcNow);
		report.DrainEvents();

		Should.Throw<InvalidSavedReportException>(() => report.Update(createdBy, name, CreateDefinition()));

		report.Name.ShouldBe("Grade 4 Contacts");
	}

	[Fact]
	[Trait("AC", "322UC6")]
	public void Update_NameLongerThan100Characters_ThrowsInvalidSavedReportExceptionAndLeavesReportUnchanged()
	{
		var createdBy = Guid.NewGuid();
		var report = SavedReport.Create(Guid.NewGuid(), "Grade 4 Contacts", CreateDefinition(), createdBy, DateTime.UtcNow);
		report.DrainEvents();
		var tooLong = new string('a', 101);

		Should.Throw<InvalidSavedReportException>(() => report.Update(createdBy, tooLong, CreateDefinition()));

		report.Name.ShouldBe("Grade 4 Contacts");
	}

	[Fact]
	[Trait("AC", "322UC7")]
	public void Update_ByCreator_RaisesExactlyOneSavedReportUpdatedCarryingBeforeAndAfterNameAndDefinition()
	{
		var createdBy = Guid.NewGuid();
		var savedReportId = Guid.NewGuid();
		var definitionBefore = CreateDefinition();
		var report = SavedReport.Create(savedReportId, "Grade 4 Contacts", definitionBefore, createdBy, DateTime.UtcNow);
		report.DrainEvents();
		var definitionAfter = ReportDefinition.Create([], ["student.name", "student.class"], _registry, _noDatasourceOptions);

		report.Update(createdBy, "Grade 5 Contacts", definitionAfter);

		var domainEvent = report.DrainEvents().ShouldHaveSingleItem().ShouldBeOfType<SavedReportUpdated>();
		ShouldlyHelpers.Satisfy(
			() => domainEvent.SavedReportId.ShouldBe(savedReportId),
			() => domainEvent.CreatedBy.ShouldBe(createdBy),
			() => domainEvent.NameBefore.ShouldBe("Grade 4 Contacts"),
			() => domainEvent.NameAfter.ShouldBe("Grade 5 Contacts"),
			() => domainEvent.DefinitionBefore.Columns.ShouldBe(StoredReportDefinition.From(definitionBefore).Columns),
			() => domainEvent.DefinitionAfter.Columns.ShouldBe(StoredReportDefinition.From(definitionAfter).Columns));
	}

	[Fact]
	[Trait("AC", "322UC8")]
	public void Delete_ByCreator_RaisesExactlyOneSavedReportDeletedCarryingIdNameAndDefinition()
	{
		var createdBy = Guid.NewGuid();
		var savedReportId = Guid.NewGuid();
		var definition = CreateDefinition();
		var report = SavedReport.Create(savedReportId, "Grade 4 Contacts", definition, createdBy, DateTime.UtcNow);
		report.DrainEvents();

		report.Delete(createdBy);

		var domainEvent = report.DrainEvents().ShouldHaveSingleItem().ShouldBeOfType<SavedReportDeleted>();
		ShouldlyHelpers.Satisfy(
			() => domainEvent.SavedReportId.ShouldBe(savedReportId),
			() => domainEvent.Name.ShouldBe("Grade 4 Contacts"),
			() => domainEvent.CreatedBy.ShouldBe(createdBy),
			() => domainEvent.Definition.Columns.ShouldBe(StoredReportDefinition.From(definition).Columns));
	}
}