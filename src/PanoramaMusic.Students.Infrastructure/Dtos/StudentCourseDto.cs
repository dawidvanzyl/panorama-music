namespace PanoramaMusic.Students.Infrastructure.Dtos;

/// <summary>
/// An enrollment row joined to its course and lesson structure, with the
/// instrument and step left-joined — both are null for a course type that
/// records neither, and the instrument alone is null for a theory course.
/// </summary>
internal sealed record StudentCourseDto(
	Guid Student_Course_Id,
	Guid Student_Id,
	Guid Course_Id,
	string Course_Type,
	decimal Cost,
	Guid Lesson_Structure_Id,
	string Lesson_Type,
	string Duration_Type,
	string Occurrence_Type,
	Guid Teacher_Id,
	string? Instrument_Type,
	string? Step_Type,
	DateOnly Enrolled_Date);