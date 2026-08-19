using PanoramaMusic.Domain;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.ValueObjects;

namespace PanoramaMusic.Students.Domain.Events.StudentCourses;

/// <summary>
/// Carries both the before snapshot and the now-updated enrollment, so a
/// consumer can record what changed without going back for the old values, and
/// the newly assigned teacher so it can be named without asking the directory.
/// </summary>
public sealed record StudentEnrollmentUpdated(
	Student Student,
	StudentCourse Before,
	StudentCourse After,
	DirectoryTeacher Teacher) : IDomainEvent;