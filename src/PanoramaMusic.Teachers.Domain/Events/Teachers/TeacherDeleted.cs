using PanoramaMusic.Domain;
using PanoramaMusic.Teachers.Domain.Entities;

namespace PanoramaMusic.Teachers.Domain.Events.Teachers;

/// <summary>
/// A teacher record was permanently removed. Raised before the row goes, and
/// carrying the teacher itself, because nothing can be read back afterwards —
/// the audit entry is what survives the deletion.
/// </summary>
public sealed record TeacherDeleted(Teacher Teacher) : IDomainEvent;