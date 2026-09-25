namespace PanoramaMusic.Reporting.Domain.Exceptions;

public sealed class EntityNotFoundException(string message)
	: Exception(message)
{
}