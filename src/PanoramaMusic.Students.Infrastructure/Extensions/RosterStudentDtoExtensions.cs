using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.ValueObjects;
using PanoramaMusic.Students.Infrastructure.Dtos;

namespace PanoramaMusic.Students.Infrastructure.Extensions;

internal static class RosterStudentDtoExtensions
{
	internal static RosterStudent MapToRosterStudent(this RosterStudentDto dto) =>
		new(
			new Student(
				dto.Student_Id,
				dto.First_Name,
				dto.Last_Name,
				dto.Date_Of_Birth,
				Enum.Parse<GradeType>(dto.Grade),
				dto.Class is null ? null : Enum.Parse<ClassType>(dto.Class),
				dto.Phase is null ? null : Enum.Parse<PhaseType>(dto.Phase),
				Enum.Parse<Language>(dto.Language)),
			(Guid[])dto.Teacher_Ids);
}