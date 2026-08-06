namespace PanoramaMusic.Teachers.Application.Requests.Teachers;

public sealed record CreateTeacherRequest(
	string FirstName,
	string Surname,
	bool IsPrivate);