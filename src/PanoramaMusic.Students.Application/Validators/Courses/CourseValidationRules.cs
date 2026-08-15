namespace PanoramaMusic.Students.Application.Validators.Courses;

/// <summary>
/// Bounds on a course cost. The backing column is NUMERIC(10, 2), so the
/// validator refuses anything the schema could not hold exactly rather than
/// letting the database round or reject it.
/// </summary>
public static class CourseValidationRules
{
	public const int CostPrecision = 10;

	public const int CostScale = 2;
}
