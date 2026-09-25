using System.Text.Json.Serialization;

namespace PanoramaMusic.Reporting.Infrastructure.Dtos;

internal sealed record StoredFilterDto(
	[property: JsonPropertyName("field")] string Field,
	[property: JsonPropertyName("operator")] string Operator,
	[property: JsonPropertyName("values")] IReadOnlyList<string> Values);

internal sealed record StoredDefinitionDto(
	[property: JsonPropertyName("filters")] IReadOnlyList<StoredFilterDto> Filters,
	[property: JsonPropertyName("columns")] IReadOnlyList<string> Columns);
