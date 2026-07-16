namespace PanoramaMusic.Identity.Domain.Exceptions;

public sealed class EntityNotFoundException(string message)
	: Exception(message)
{
}