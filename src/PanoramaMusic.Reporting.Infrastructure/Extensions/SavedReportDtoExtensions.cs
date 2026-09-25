using PanoramaMusic.Reporting.Domain.Entities;
using PanoramaMusic.Reporting.Domain.ValueObjects;
using PanoramaMusic.Reporting.Infrastructure.Dtos;
using System.Text.Json;

namespace PanoramaMusic.Reporting.Infrastructure.Extensions;

internal static class SavedReportDtoExtensions
{
	internal static StoredDefinitionDto ToDefinitionDto(this StoredReportDefinition definition) => new(
		[.. definition.Filters.Select(filter => new StoredFilterDto(filter.Field, filter.Operator, filter.Values))],
		definition.Columns);

	internal static string ToJson(this StoredReportDefinition definition) =>
		JsonSerializer.Serialize(definition.ToDefinitionDto());

	internal static StoredReportDefinition ToStoredReportDefinition(this string json)
	{
		var dto = JsonSerializer.Deserialize<StoredDefinitionDto>(json)
			?? throw new InvalidOperationException("A saved report's stored definition could not be read.");

		return new StoredReportDefinition(
			[.. dto.Filters.Select(filter => new ReportFilterInput(filter.Field, filter.Operator, filter.Values))],
			dto.Columns);
	}

	internal static SavedReportRecord MapToSavedReportRecord(this SavedReportDto dto)
	{
		var report = new SavedReport(
			dto.Saved_Report_Id,
			dto.Name,
			dto.Definition.ToStoredReportDefinition(),
			dto.Created_By,
			DateTime.SpecifyKind(dto.Created_At, DateTimeKind.Utc),
			dto.Last_Run_At.HasValue ? DateTime.SpecifyKind(dto.Last_Run_At.Value, DateTimeKind.Utc) : null);

		return new SavedReportRecord(report, dto.Creator_Email);
	}
}
