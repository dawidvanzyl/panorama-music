using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Infrastructure.Dtos;

namespace PanoramaMusic.Students.Infrastructure.Extensions;

internal static class StudentDtoExtensions
{
	internal static Student MapToStudent(this StudentDto dto) =>
		new(
			dto.Student_Id,
			dto.First_Name,
			dto.Last_Name,
			dto.Date_Of_Birth,
			Enum.Parse<GradeType>(dto.Grade),
			Enum.Parse<ClassType>(dto.Class),
			Enum.Parse<PhaseType>(dto.Phase),
			Enum.Parse<Language>(dto.Language));
}