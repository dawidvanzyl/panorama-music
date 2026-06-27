namespace PanoramaMusic.Api.Exceptions;

public sealed class RequestValidationException(IReadOnlyList<RequestValidationError> errors) : Exception
{
	public IReadOnlyList<RequestValidationError> Errors { get; } = errors;
}