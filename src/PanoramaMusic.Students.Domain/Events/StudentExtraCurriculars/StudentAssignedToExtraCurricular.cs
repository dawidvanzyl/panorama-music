using PanoramaMusic.Domain;
using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Domain.Events.StudentExtraCurriculars;

/// <summary>
/// A student was assigned to an extra-curricular activity. Carries the student as
/// well as the assignment, so a consumer can name both without a further read.
/// </summary>
public sealed record StudentAssignedToExtraCurricular(
	Student Student,
	StudentExtraCurricular Assignment) : IDomainEvent;