namespace PanoramaMusic.Domain;

/// <summary>
/// Marker for a fact raised by an aggregate root describing something that
/// happened. Self-describing — a concrete event carries every value a
/// consumer needs (identifiers, before/after values, display text) captured
/// at the moment it is raised, so consumers never re-query to enrich it.
/// </summary>
public interface IDomainEvent
{
}