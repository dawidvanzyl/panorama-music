namespace PanoramaMusic.Reporting.Domain.ValueObjects;

/// <summary>
/// One record of a non-Student collection (e.g. a Guardian link), carrying the
/// student it belongs to and its selected columns' raw source values. No
/// #317 reader produces these — the type exists so the run path's contract
/// does not change when #318 adds readers that do.
/// </summary>
public sealed record CollectionRecord(Guid StudentId, SourceValues Sources);
