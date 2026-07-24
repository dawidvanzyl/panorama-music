namespace PanoramaMusic.Students.Domain.Exceptions;

public sealed class EntityNotFoundException(string message)
	: Exception(message)
{
}