using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Application.Models;

public sealed record StudentResult(
	Guid StudentId,
	string FirstName,
	string LastName,
	DateOnly DateOfBirth,
	GradeType Grade,
	ClassType Class,
	PhaseType Phase,
	Language Language);