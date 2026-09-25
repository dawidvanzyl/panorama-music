namespace PanoramaMusic.Reporting.Infrastructure.Dtos;

internal sealed record SavedReportDto(
	Guid Saved_Report_Id,
	string Name,
	string Definition,
	Guid Created_By,
	string? Creator_Email,
	DateTime Created_At,
	DateTime? Last_Run_At);
