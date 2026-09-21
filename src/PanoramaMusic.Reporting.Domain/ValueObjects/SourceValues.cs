namespace PanoramaMusic.Reporting.Domain.ValueObjects;

/// <summary>
/// A read-only map from a column's logical source name (e.g. <c>firstName</c>,
/// <c>siblingCount</c>) to its raw value for one student. Source names are
/// declared by the registry and resolved to SQL only in Infrastructure's
/// catalog — nothing here is a column or table name.
/// </summary>
public sealed class SourceValues
{
	private readonly IReadOnlyDictionary<string, object?> _values;

	public SourceValues(IReadOnlyDictionary<string, object?> values)
	{
		_values = values;
	}

	public static SourceValues Empty { get; } = new(new Dictionary<string, object?>());

	public object? Get(string source) => _values.TryGetValue(source, out var value) ? value : null;

	public string? GetString(string source) => Get(source) as string;

	public bool GetBoolean(string source) => Get(source) is true;

	public int GetInt32(string source) => Get(source) switch
	{
		int i => i,
		long l => (int)l,
		_ => 0,
	};

	public DateOnly? GetDate(string source) => Get(source) switch
	{
		DateOnly d => d,
		DateTime dt => DateOnly.FromDateTime(dt),
		_ => null,
	};
}