namespace PanoramaMusic.Students.Infrastructure.Dtos;

/// <summary>
/// A course row joined to its lesson structure. Cost is a decimal end to end —
/// the column is NUMERIC and nothing between it and the wire is floating point.
/// </summary>
internal sealed record CourseDto(
	Guid Course_Id,
	string Course_Type,
	decimal Cost,
	Guid Lesson_Structure_Id,
	string Lesson_Type,
	string Duration_Type,
	string Occurrence_Type);
