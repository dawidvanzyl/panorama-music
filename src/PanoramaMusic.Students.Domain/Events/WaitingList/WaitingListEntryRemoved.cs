using PanoramaMusic.Domain;
using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Domain.Events.WaitingList;

public sealed record WaitingListEntryRemoved(WaitingListEntry Entry) : IDomainEvent;
