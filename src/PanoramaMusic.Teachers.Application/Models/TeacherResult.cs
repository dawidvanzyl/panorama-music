namespace PanoramaMusic.Teachers.Application.Models;

public sealed record TeacherResult(
	Guid TeacherId,
	string FirstName,
	string Surname,
	bool IsPrivate,
	bool IsActive,
	Guid? LinkedAccountId);