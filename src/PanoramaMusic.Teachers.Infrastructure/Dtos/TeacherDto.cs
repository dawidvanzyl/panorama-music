namespace PanoramaMusic.Teachers.Infrastructure.Dtos;

internal sealed record TeacherDto(
	Guid Teacher_Id,
	string First_Name,
	string Surname,
	bool Is_Private,
	bool Is_Active,
	Guid? Linked_Account_Id);