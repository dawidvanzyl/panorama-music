namespace PanoramaMusic.Students.Domain.Exceptions;

public sealed class EntityAlreadyExistsException(string message)
	: Exception(message)
{
}