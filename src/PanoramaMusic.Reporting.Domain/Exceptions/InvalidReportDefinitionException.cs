namespace PanoramaMusic.Reporting.Domain.Exceptions;

/// <summary>
/// A report definition failed one of <c>ReportDefinition.Create</c>'s checks —
/// an unknown field or column key, an operator the field's type does not
/// allow, or an invalid value. The message names the offending key, operator
/// or value, truncated where it echoes client-supplied text (see
/// <c>ReportDefinitionMessages</c>).
/// </summary>
public sealed class InvalidReportDefinitionException(string message)
	: DomainException(message)
{
}