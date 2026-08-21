using PanoramaMusic.Domain;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.ValueObjects;

namespace PanoramaMusic.Students.Domain.Events.StudentCourses;

/// <summary>
/// Carries the teacher alongside the enrollment so a consumer can name who was
/// assigned without going back to the directory for it.
/// </summary>
public sealed record StudentEnrolled(Student Student, StudentCourse Enrollment, DirectoryTeacher Teacher) : IDomainEvent;