namespace PanoramaMusic.Students.Domain.Exceptions;

/// <summary>
/// The caller is authenticated and reached an endpoint they are allowed to
/// call, but is not allowed to act on this particular record. Distinct from
/// <see cref="DomainException"/>, which says the request itself is invalid for
/// anyone: this one is about who is asking.
/// </summary>
public sealed class ForbiddenException(string message)
	: Exception(message)
{
}
