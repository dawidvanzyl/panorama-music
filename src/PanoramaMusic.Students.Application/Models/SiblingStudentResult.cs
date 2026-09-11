using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Application.Models;

/// <summary>
/// A student in the Siblings tab — a candidate on offer, or a sibling already
/// linked. Carries the same fields as <see cref="StudentResult"/> plus the
/// listing they belong to, so the client states which kind of sibling it is
/// showing rather than re-deriving it from a second read.
/// </summary>
public sealed record SiblingStudentResult(
	Guid StudentId,
	string FirstName,
	string LastName,
	DateOnly DateOfBirth,
	GradeType Grade,
	ClassType? Class,
	PhaseType? Phase,
	Language Language,
	StudentPopulation Population);