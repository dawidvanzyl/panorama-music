using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Application.Requests;

public sealed record UpdateStudentRequest(
	string FirstName,
	string LastName,
	DateOnly DateOfBirth,
	GradeType Grade,
	ClassType? Class,
	PhaseType? Phase,
	Language Language);