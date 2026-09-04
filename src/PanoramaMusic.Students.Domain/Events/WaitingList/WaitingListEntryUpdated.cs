using PanoramaMusic.Domain;
using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Domain.Events.WaitingList;

/// <summary>
/// Carries both the snapshot taken before the change and the updated entry, so
/// an audit record can state what the correction actually altered.
/// </summary>
public sealed record WaitingListEntryUpdated(WaitingListEntry Before, WaitingListEntry Entry) : IDomainEvent;