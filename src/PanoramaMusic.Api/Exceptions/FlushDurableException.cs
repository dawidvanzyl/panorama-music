namespace PanoramaMusic.Api.Exceptions;

public class FlushDurableException(string message, Exception innerException)
	: Exception(message, innerException)
{
}