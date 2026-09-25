using PanoramaMusic.Domain;
using PanoramaMusic.Reporting.Domain.ValueObjects;

namespace PanoramaMusic.Reporting.Domain.Events;

public sealed record SavedReportUpdated(
	Guid SavedReportId,
	Guid CreatedBy,
	string NameBefore,
	StoredReportDefinition DefinitionBefore,
	string NameAfter,
	StoredReportDefinition DefinitionAfter) : IDomainEvent;
