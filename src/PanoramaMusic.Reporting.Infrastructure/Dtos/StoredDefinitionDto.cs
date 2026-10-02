using System.Text.Json.Serialization;

namespace PanoramaMusic.Reporting.Infrastructure.Dtos;

internal sealed record StoredDefinitionDto(
	[property: JsonPropertyName("filters")] IReadOnlyList<StoredFilterDto> Filters,
	[property: JsonPropertyName("columns")] IReadOnlyList<string> Columns);