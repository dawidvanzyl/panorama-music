namespace PanoramaMusic.Reporting.Domain.ValueObjects;

/// <summary>
/// One record of a non-Student collection (e.g. a Guardian link), carrying
/// the student it belongs to and that collection's raw source values.
/// </summary>
public sealed record CollectionRecord(Guid StudentId, SourceValues Sources);