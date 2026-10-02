namespace PanoramaMusic.Reporting.Application.Models;

public sealed record ReportColumnFieldResult(
	string Key,
	string Collection,
	string Header,
	int DisplayOrder,
	string? DependsOn,
	bool Locked);