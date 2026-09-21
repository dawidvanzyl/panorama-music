namespace PanoramaMusic.Reporting.Domain.Messages;

/// <summary>
/// The refusals <c>ReportDefinition.Create</c> produces. Every message that
/// quotes a client-supplied key or value truncates it to 100 characters first
/// (ASVS 1.3.3 / 15.2.2) — the 400 body echoes these verbatim, so an
/// oversized request cannot inflate the response.
/// </summary>
public static class ReportDefinitionMessages
{
	private const int _maxQuotedLength = 100;

	public static string Truncate(string value) =>
		value.Length <= _maxQuotedLength ? value : value[.._maxQuotedLength];

	public static string UnknownField(string key) => $"Unknown filter field '{Truncate(key)}'.";

	public static string UnknownColumn(string key) => $"Unknown column '{Truncate(key)}'.";

	public static string InvalidOperator(string field, string op) =>
		$"Operator '{Truncate(op)}' is not valid for field '{Truncate(field)}'.";

	public static string MissingValue(string field) => $"Field '{Truncate(field)}' requires a value.";

	public static string InvalidValue(string field, string value) =>
		$"Value '{Truncate(value)}' is not valid for field '{Truncate(field)}'.";

	public static string SingleValueOnly(string field, string op) =>
		$"Operator '{Truncate(op)}' on field '{Truncate(field)}' accepts exactly one value.";

	public static string ValueTooLong(string field) => $"Value for field '{Truncate(field)}' is too long.";

	public const string StudentColumnRequired = "The column set must include Student.";

	public static string DuplicateColumn(string key) => $"Duplicate column '{Truncate(key)}'.";

	public const string TooManyColumns = "A report may select at most 10 columns.";
}