using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Application.Requests.Students;

public sealed record CreateStudentRequest(
	string FirstName,
	string LastName,
	DateOnly DateOfBirth,
	GradeType Grade,
	ClassType? Class,
	PhaseType? Phase,
	Language Language);