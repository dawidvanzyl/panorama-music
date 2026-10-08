using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Application.Models;

/// <summary>
/// A student in the roster listing. Carries the same fields as
/// <see cref="StudentResult"/> plus the teachers of the courses they hold, so the
/// client can filter the roster by teacher without a second read.
/// </summary>
public sealed record RosterStudentResult(
	Guid StudentId,
	string FirstName,
	string LastName,
	DateOnly DateOfBirth,
	GradeType Grade,
	ClassType? Class,
	PhaseType? Phase,
	Language Language,
	IReadOnlyList<Guid> TeacherIds);