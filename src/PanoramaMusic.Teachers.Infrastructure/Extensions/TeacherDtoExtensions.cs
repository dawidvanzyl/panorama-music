using PanoramaMusic.Teachers.Domain.Entities;
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
			dto.Linked_Account_Id);
}