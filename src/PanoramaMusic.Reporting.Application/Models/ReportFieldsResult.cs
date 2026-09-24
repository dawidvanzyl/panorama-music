namespace PanoramaMusic.Reporting.Application.Models;

public sealed record ReportFieldOptionResult(string Value, string Label);

public sealed record ReportFilterFieldResult(
	string Key,
	string Collection,
	string Label,
	string DataType,
	IReadOnlyList<string> Operators,
	IReadOnlyList<ReportFieldOptionResult> Options);

public sealed record ReportColumnFieldResult(
	string Key,
	string Collection,
	string Header,
	int DisplayOrder,
	string? DependsOn,
	bool Locked);

public sealed record ReportFieldsResult(
	IReadOnlyList<ReportFilterFieldResult> Filters,
	IReadOnlyList<ReportColumnFieldResult> Columns);