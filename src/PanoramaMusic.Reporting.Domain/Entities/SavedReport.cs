using PanoramaMusic.Domain;
using PanoramaMusic.Reporting.Domain.Events;
using PanoramaMusic.Reporting.Domain.Exceptions;
using PanoramaMusic.Reporting.Domain.Messages;
using PanoramaMusic.Reporting.Domain.ValueObjects;

namespace PanoramaMusic.Reporting.Domain.Entities;

public sealed class SavedReport : AggregateRoot
{
	private const int _maxNameLength = 100;

	public SavedReport(
		Guid savedReportId,
		string name,
		StoredReportDefinition definition,
		Guid createdBy,
		DateTime createdAt,
		DateTime? lastRunAt)
	{
		SavedReportId = savedReportId;
		Name = name;
		Definition = definition;
		CreatedBy = createdBy;
		CreatedAt = createdAt;
		LastRunAt = lastRunAt;
	}

	public Guid SavedReportId { get; }

	public string Name { get; private set; }

	public StoredReportDefinition Definition { get; private set; }

	public Guid CreatedBy { get; }

	public DateTime CreatedAt { get; }

	public DateTime? LastRunAt { get; private set; }

	public static SavedReport Create(
		Guid savedReportId,
		string name,
		ReportDefinition definition,
		Guid createdBy,
		DateTime createdAt)
	{
		var trimmedName = NormaliseName(name);
		var storedDefinition = StoredReportDefinition.From(definition);

		var report = new SavedReport(savedReportId, trimmedName, storedDefinition, createdBy, createdAt, lastRunAt: null);

		report.Raise(new SavedReportCreated(savedReportId, trimmedName, storedDefinition, createdBy));

		return report;
	}

	/// <summary>Runs are not audited — this raises no event.</summary>
	public void RecordRun(DateTime ranAt)
	{
		LastRunAt = ranAt;
	}

	public void EnsureCreatedBy(Guid actorId)
	{
		if (actorId != CreatedBy)
			throw new ForbiddenException(SavedReportMessages.NotCreator);
	}

	public void Update(Guid actorId, string name, ReportDefinition definition)
	{
		EnsureCreatedBy(actorId);

		var trimmedName = NormaliseName(name);
		var storedDefinition = StoredReportDefinition.From(definition);

		var nameBefore = Name;
		var definitionBefore = Definition;

		Name = trimmedName;
		Definition = storedDefinition;

		Raise(new SavedReportUpdated(SavedReportId, CreatedBy, nameBefore, definitionBefore, trimmedName, storedDefinition));
	}

	public void Delete(Guid actorId)
	{
		EnsureCreatedBy(actorId);

		Raise(new SavedReportDeleted(SavedReportId, Name, Definition, CreatedBy));
	}

	private static string NormaliseName(string name)
	{
		var trimmedName = name.Trim();
		if (trimmedName.Length == 0)
			throw new InvalidSavedReportException(SavedReportMessages.NameRequired);

		if (trimmedName.Length > _maxNameLength)
			throw new InvalidSavedReportException(SavedReportMessages.NameTooLong);

		return trimmedName;
	}
}