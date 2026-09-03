using PanoramaMusic.Domain;
using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Domain.Events.WaitingList;

public sealed record WaitingListEntryCreated(WaitingListEntry Entry) : IDomainEvent;
