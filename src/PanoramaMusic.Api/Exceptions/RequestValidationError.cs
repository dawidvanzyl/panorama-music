using System.Text.Json.Serialization;

namespace PanoramaMusic.Api.Exceptions;

public sealed record RequestValidationError(
	[property: JsonPropertyName("propertyName")] string PropertyName,
	[property: JsonPropertyName("errorMessage")] string ErrorMessage);