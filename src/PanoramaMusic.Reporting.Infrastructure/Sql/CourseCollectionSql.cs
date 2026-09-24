namespace PanoramaMusic.Reporting.Infrastructure.Sql;

/// <summary>
/// The Course collection's fixed, set-based query. The join to
/// <c>teachers.teachers</c> is the issue's sanctioned cross-schema read —
/// only the teacher's id, name and active flag are ever touched.
/// </summary>
internal static class CourseCollectionSql
{
	public const string Query = """
		SELECT sc.student_id, sc.student_course_id, c.course_type, ls.lesson_type, ls.duration_type, ls.occurrence_type,
		       si.instrument_type, si.step_type,
		       t.first_name AS teacher_first_name, t.surname AS teacher_surname, t.is_active AS teacher_is_active,
		       (t.teacher_id IS NOT NULL) AS teacher_exists
		FROM students.student_courses sc
		JOIN students.courses c ON c.course_id = sc.course_id
		JOIN students.lesson_structures ls ON ls.lesson_structure_id = c.lesson_structure_id
		LEFT JOIN students.student_instruments si ON si.student_course_id = sc.student_course_id
		LEFT JOIN teachers.teachers t ON t.teacher_id = sc.teacher_id
		WHERE sc.student_id = ANY(@studentIds)
		""";

	/// <summary>SQL column alias -> the logical source name it resolves to.</summary>
	public static readonly IReadOnlyDictionary<string, string> Sources = new Dictionary<string, string>
	{
		["student_course_id"] = "studentCourseId",
		["course_type"] = "courseType",
		["lesson_type"] = "lessonType",
		["duration_type"] = "durationType",
		["occurrence_type"] = "occurrenceType",
		["instrument_type"] = "instrumentType",
		["step_type"] = "stepType",
		["teacher_first_name"] = "teacherFirstName",
		["teacher_surname"] = "teacherSurname",
		["teacher_is_active"] = "teacherIsActive",
		["teacher_exists"] = "teacherExists",
	};
}