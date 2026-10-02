namespace PanoramaMusic.Reporting.Application.Models;

public sealed record SavedReportDetailResult(
	Guid Id,
	string Name,
	string CreatedBy,
	DateTime? LastRunAt,
	bool IsOwner,
	SavedReportDefinitionResult Definition);