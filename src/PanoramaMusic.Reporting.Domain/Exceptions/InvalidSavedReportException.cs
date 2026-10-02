namespace PanoramaMusic.Reporting.Domain.Exceptions;

public sealed class InvalidSavedReportException(string message)
	: DomainException(message)
{
}