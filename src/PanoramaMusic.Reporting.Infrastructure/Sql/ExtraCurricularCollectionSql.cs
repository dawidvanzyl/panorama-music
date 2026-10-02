namespace PanoramaMusic.Reporting.Infrastructure.Sql;

/// <summary>
/// The Extra-Curricular collection's fixed, set-based query. Practice times
/// come from a grouped CTE, so an activity's slots arrive as one row rather
/// than a lookup per activity.
/// </summary>
internal static class ExtraCurricularCollectionSql
{
	public const string Query = """
		WITH practice AS (
		  SELECT pt.extra_curricular_id,
		         array_agg(pt.day ORDER BY pt.practice_time_id)        AS practice_days,
		         array_agg(pt.start_time ORDER BY pt.practice_time_id) AS practice_start_times
		  FROM students.extra_curricular_practice_times pt
		  WHERE pt.extra_curricular_id IN (SELECT sec.extra_curricular_id FROM students.student_extra_curriculars sec
		                                   WHERE sec.student_id = ANY(@studentIds))
		  GROUP BY pt.extra_curricular_id)
		SELECT sec.student_id, ec.extra_curricular_id, ec.description AS activity, ec.phase, p.practice_days, p.practice_start_times
		FROM students.student_extra_curriculars sec
		JOIN students.extra_curriculars ec ON ec.extra_curricular_id = sec.extra_curricular_id
		LEFT JOIN practice p ON p.extra_curricular_id = ec.extra_curricular_id
		WHERE sec.student_id = ANY(@studentIds)
		""";

	public static string Compose(string? recordCondition) =>
		recordCondition is null ? Query : $"{Query} AND {recordCondition}";

	/// <summary>SQL column alias -> the logical source name it resolves to.</summary>
	public static readonly IReadOnlyDictionary<string, string> Sources = new Dictionary<string, string>
	{
		["extra_curricular_id"] = "extraCurricularId",
		["activity"] = "activity",
		["phase"] = "phase",
		["practice_days"] = "practiceDays",
		["practice_start_times"] = "practiceStartTimes",
	};
}