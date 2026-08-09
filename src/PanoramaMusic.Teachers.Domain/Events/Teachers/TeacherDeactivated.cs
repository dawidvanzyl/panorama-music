using PanoramaMusic.Domain;
using PanoramaMusic.Teachers.Domain.Entities;

namespace PanoramaMusic.Teachers.Domain.Events.Teachers;

/// <summary>
/// A teacher was taken out of active service. The banking details deleted
/// alongside it raise their own event under the banking rules — deactivation
/// does not describe them, so an account number can never reach this entry.
/// </summary>
public sealed record TeacherDeactivated(Teacher Teacher) : IDomainEvent;