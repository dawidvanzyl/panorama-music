namespace PanoramaMusic.Domain.Exceptions;

public sealed class EntityNotFoundException(string message)
	: Exception(message)
{
}