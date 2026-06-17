namespace PanoramaMusic.Identity.Domain.Exceptions;

public sealed class InvalidResetTokenException(string message)
	: Exception(message)
{
}