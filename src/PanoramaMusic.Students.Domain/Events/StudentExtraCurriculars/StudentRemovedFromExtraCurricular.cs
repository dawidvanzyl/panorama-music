using PanoramaMusic.Domain;
using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Domain.Events.StudentExtraCurriculars;

/// <summary>
/// A student's participation in an extra-curricular activity was removed. Only
/// the link went; the student and the activity both remain.
/// </summary>
public sealed record StudentRemovedFromExtraCurricular(
	Student Student,
	StudentExtraCurricular Assignment) : IDomainEvent;