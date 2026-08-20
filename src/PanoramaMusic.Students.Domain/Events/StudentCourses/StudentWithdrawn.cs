using PanoramaMusic.Domain;
using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Domain.Events.StudentCourses;

/// <summary>
/// Carries the student alongside the enrollment being removed, so a consumer can
/// name who was withdrawn from what after the record itself is gone.
/// </summary>
public sealed record StudentWithdrawn(Student Student, StudentCourse Enrollment) : IDomainEvent;