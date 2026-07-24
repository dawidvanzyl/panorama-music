namespace PanoramaMusic.Students.Infrastructure.Dtos;

internal sealed record StudentDto(
	Guid Student_Id,
	string First_Name,
	string Last_Name,
	DateOnly Date_Of_Birth,
	string Grade,
	string? Class,
	string? Phase,
	string Language);