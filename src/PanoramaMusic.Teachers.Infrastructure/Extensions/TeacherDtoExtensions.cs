using PanoramaMusic.Teachers.Domain.Entities;
using PanoramaMusic.Teachers.Domain.ValueObjects;
using PanoramaMusic.Teachers.Infrastructure.Dtos;

namespace PanoramaMusic.Teachers.Infrastructure.Extensions;

internal static class TeacherDtoExtensions
{
	internal static Teacher MapToTeacher(this TeacherDto dto) =>
		new(
			dto.Teacher_Id,
			dto.First_Name,
			dto.Surname,
			dto.Is_Private,
			dto.Is_Active,
			dto.Linked_Account_Id,
			dto.Linked_Account_Email);

	internal static LinkableAccount MapToLinkableAccount(this LinkableAccountDto dto) =>
		new(dto.Account_Id, dto.Email);

	internal static AccountLinkState MapToAccountLinkState(this AccountLinkStateDto dto) =>
		new(dto.Email, dto.Has_Teacher_Role, dto.Is_Linked);
}