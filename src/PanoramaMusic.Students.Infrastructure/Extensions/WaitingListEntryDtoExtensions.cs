using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Infrastructure.Dtos;

namespace PanoramaMusic.Students.Infrastructure.Extensions;

internal static class WaitingListEntryDtoExtensions
{
	internal static WaitingListEntry MapToWaitingListEntry(this WaitingListEntryDto dto) =>
		new(
			dto.Waiting_List_Entry_Id,
			new Student(
				dto.Student_Id,
				dto.First_Name,
				dto.Last_Name,
				dto.Date_Of_Birth,
				Enum.Parse<GradeType>(dto.Grade),
				dto.Class is null ? null : Enum.Parse<ClassType>(dto.Class),
				dto.Phase is null ? null : Enum.Parse<PhaseType>(dto.Phase),
				Enum.Parse<Language>(dto.Language)),
			new LessonStructure(
				dto.Lesson_Structure_Id,
				Enum.Parse<LessonType>(dto.Lesson_Type),
				Enum.Parse<DurationType>(dto.Duration_Type),
				Enum.Parse<OccurrenceType>(dto.Occurrence_Type)),
			Enum.Parse<InstrumentType>(dto.Instrument_Type),
			dto.Notes,
			dto.Added_At);
}