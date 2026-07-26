using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Infrastructure.Dtos;

namespace PanoramaMusic.Students.Infrastructure.Extensions;

internal static class GuardianDtoExtensions
{
	internal static Guardian MapToGuardian(this GuardianDto dto) =>
		new(
			dto.Guardian_Id,
			dto.Guardian_Relationship_Id,
			dto.First_Name,
			dto.Surname,
			dto.Cell,
			dto.Email,
			dto.Receives_Correspondence,
			dto.Responsible_For_Payment,
			dto.Married);

	internal static GuardianRelationship MapToGuardianRelationship(this GuardianRelationshipDto dto) =>
		new(dto.Guardian_Relationship_Id, dto.Name);
}