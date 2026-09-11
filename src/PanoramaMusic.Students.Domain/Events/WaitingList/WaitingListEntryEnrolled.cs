using PanoramaMusic.Domain;
using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Domain.Events.WaitingList;

/// <summary>
/// The entry was consumed by an enrollment rather than discarded. Distinct from
/// <see cref="WaitingListEntryRemoved"/> because the student stays: one ends a
/// student's record along with their place in the queue, the other ends only the
/// queue place, and an audit reader must be able to tell them apart.
/// </summary>
public sealed record WaitingListEntryEnrolled(WaitingListEntry Entry, StudentCourse Enrollment) : IDomainEvent;