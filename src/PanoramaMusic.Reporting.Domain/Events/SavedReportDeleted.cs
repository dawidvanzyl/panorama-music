using PanoramaMusic.Domain;
using PanoramaMusic.Reporting.Domain.ValueObjects;

namespace PanoramaMusic.Reporting.Domain.Events;

public sealed record SavedReportDeleted(
	Guid SavedReportId,
	string Name,
	StoredReportDefinition Definition,
	Guid CreatedBy) : IDomainEvent;
