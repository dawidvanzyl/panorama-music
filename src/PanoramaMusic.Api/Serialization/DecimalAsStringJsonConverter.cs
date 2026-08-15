using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace PanoramaMusic.Api.Serialization;

/// <summary>
/// Writes every decimal as a JSON string so a monetary amount never becomes an
/// IEEE-754 double in a consumer that parses JSON numbers as doubles. Reading
/// still accepts a bare JSON number, so a caller that sends one is not rejected.
/// </summary>
public sealed class DecimalAsStringJsonConverter : JsonConverter<decimal>
{
	public override decimal Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) =>
		reader.TokenType switch
		{
			JsonTokenType.Number => reader.GetDecimal(),
			JsonTokenType.String => ReadFromString(reader.GetString()),
			_ => throw new JsonException($"Expected a number or a numeric string, found {reader.TokenType}."),
		};

	/// <summary>A non-numeric string is a malformed payload, not a bound value.</summary>
	private static decimal ReadFromString(string? value) =>
		decimal.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out var parsed)
			? parsed
			: throw new JsonException($"'{value}' is not a numeric value.");

	public override void Write(Utf8JsonWriter writer, decimal value, JsonSerializerOptions options) =>
		writer.WriteStringValue(value.ToString(CultureInfo.InvariantCulture));
}
