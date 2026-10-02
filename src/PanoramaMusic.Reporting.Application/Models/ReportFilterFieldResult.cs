namespace PanoramaMusic.Reporting.Application.Models;

public sealed record ReportFilterFieldResult(
	string Key,
	string Collection,
	string Label,
	string DataType,
	IReadOnlyList<string> Operators,
	IReadOnlyList<ReportFieldOptionResult> Options);