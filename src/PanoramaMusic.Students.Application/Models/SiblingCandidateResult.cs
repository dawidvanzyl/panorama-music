using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Application.Models;

/// <summary>
/// A student who may be linked as a sibling. Carries the same fields as
/// <see cref="StudentResult"/> plus the listing they belong to, so the client
/// states which kind of sibling is being linked rather than re-deriving it from
/// a second read.
/// </summary>
public sealed record SiblingCandidateResult(
	Guid StudentId,
	string FirstName,
	string LastName,
	DateOnly DateOfBirth,
	GradeType Grade,
	ClassType? Class,
	PhaseType? Phase,
	Language Language,
	StudentPopulation Population);
