namespace PanoramaMusic.Students.Infrastructure.Dtos;

internal sealed record GuardianDto(
	Guid Guardian_Id,
	Guid Guardian_Relationship_Id,
	string First_Name,
	string Surname,
	string? Cell,
	string? Email,
	bool Receives_Correspondence,
	bool Responsible_For_Payment,
	bool Married);