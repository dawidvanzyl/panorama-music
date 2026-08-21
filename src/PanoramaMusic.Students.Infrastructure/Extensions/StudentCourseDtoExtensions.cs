using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Infrastructure.Dtos;

namespace PanoramaMusic.Students.Infrastructure.Extensions;

internal static class StudentCourseDtoExtensions
{
	internal static StudentCourse MapToStudentCourse(this StudentCourseDto dto) =>
		new(
			dto.Student_Course_Id,
			dto.Student_Id,
			new Course(
				dto.Course_Id,
				Enum.Parse<CourseType>(dto.Course_Type),
				dto.Cost,
				new LessonStructure(
					dto.Lesson_Structure_Id,
					Enum.Parse<LessonType>(dto.Lesson_Type),
					Enum.Parse<DurationType>(dto.Duration_Type),
					Enum.Parse<OccurrenceType>(dto.Occurrence_Type))),
			dto.Teacher_Id,
			dto.Enrolled_Date,
			MapToInstrument(dto));

	/// <summary>
	/// The step is what marks an instrument row as present at all — a course type
	/// that records neither leaves both columns null, while a theory course
	/// leaves only the instrument type null.
	/// </summary>
	private static StudentInstrument? MapToInstrument(StudentCourseDto dto) =>
		dto.Step_Type is null
			? null
			: new StudentInstrument(
				dto.Instrument_Type is null ? null : Enum.Parse<InstrumentType>(dto.Instrument_Type),
				Enum.Parse<StepType>(dto.Step_Type));
}