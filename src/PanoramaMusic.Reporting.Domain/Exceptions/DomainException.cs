namespace PanoramaMusic.Reporting.Domain.Exceptions;

/// <summary>
/// Base of the Reporting context's own domain exceptions. Unlike the other
/// contexts' single sealed <c>DomainException</c>, this one stays open because
/// every refusal in this context is a single, well-known shape —
/// <see cref="InvalidReportDefinitionException"/> — that the Api layer's
/// exception handler catches through this base type, the same way it catches
/// the other contexts' <c>DomainException</c> by exact type.
/// </summary>
public abstract class DomainException(string message)
	: Exception(message)
{
}