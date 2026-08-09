namespace PanoramaMusic.Teachers.Application.Requests.Teachers;

public sealed record UpdateTeacherProfileRequest(
	string FirstName,
	string Surname);