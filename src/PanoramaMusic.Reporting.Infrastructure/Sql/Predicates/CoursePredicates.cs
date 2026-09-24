using Dapper;
using PanoramaMusic.Reporting.Domain.Enums;
using static PanoramaMusic.Reporting.Infrastructure.Sql.Predicates.CollectionExistsPredicate;

namespace PanoramaMusic.Reporting.Infrastructure.Sql.Predicates;

/// <summary>The Course collection's filter predicates, keyed exactly as the registry declares them.</summary>
internal static class CoursePredicates
{
	private const string _fromJoin =
		"FROM students.student_courses sc " +
		"JOIN students.courses c ON c.course_id = sc.course_id " +
		"JOIN students.lesson_structures ls ON ls.lesson_structure_id = c.lesson_structure_id";

	private const string _fromJoinWithInstrument = _fromJoin +
		" JOIN students.student_instruments si ON si.student_course_id = sc.student_course_id";

	private const string _joinCondition = "sc.student_id = s.student_id";

	public static IReadOnlyDictionary<(string Field, FilterOperator Operator), StudentSqlCatalog.PredicateBuilder> Build() =>
		new Dictionary<(string, FilterOperator), StudentSqlCatalog.PredicateBuilder>
		{
			[("course.courseType", FilterOperator.Equals)] = StringEquals("c.course_type"),
			[("course.courseType", FilterOperator.In)] = StringIn("c.course_type"),
			[("course.lessonType", FilterOperator.Equals)] = StringEquals("ls.lesson_type"),
			[("course.lessonType", FilterOperator.In)] = StringIn("ls.lesson_type"),
			[("course.durationType", FilterOperator.Equals)] = StringEquals("ls.duration_type"),
			[("course.durationType", FilterOperator.In)] = StringIn("ls.duration_type"),
			[("course.occurrenceType", FilterOperator.Equals)] = StringEquals("ls.occurrence_type"),
			[("course.occurrenceType", FilterOperator.In)] = StringIn("ls.occurrence_type"),
			[("course.instrumentType", FilterOperator.Equals)] = InstrumentTypeEquals,
			[("course.instrumentType", FilterOperator.In)] = InstrumentTypeIn,
			[("course.stepType", FilterOperator.Equals)] = StepTypeEquals,
			[("course.stepType", FilterOperator.In)] = StepTypeIn,
			[("course.teacher", FilterOperator.Equals)] = TeacherEquals,
			[("course.teacher", FilterOperator.In)] = TeacherIn,
		};

	private static StudentSqlCatalog.PredicateBuilder StringEquals(string column) => (paramName, parameters, values) =>
	{
		parameters.Add(paramName, values[0]);
		return Exists(_fromJoin, _joinCondition, $"{column} = @{paramName}");
	};

	private static StudentSqlCatalog.PredicateBuilder StringIn(string column) => (paramName, parameters, values) =>
	{
		parameters.Add(paramName, values.ToArray());
		return Exists(_fromJoin, _joinCondition, $"{column} = ANY(@{paramName})");
	};

	private static PredicateFragment InstrumentTypeEquals(string paramName, DynamicParameters parameters, IReadOnlyList<string> values)
	{
		parameters.Add(paramName, values[0]);
		return Exists(_fromJoinWithInstrument, _joinCondition, $"c.course_type = 'Instrument' AND si.instrument_type = @{paramName}");
	}

	private static PredicateFragment InstrumentTypeIn(string paramName, DynamicParameters parameters, IReadOnlyList<string> values)
	{
		parameters.Add(paramName, values.ToArray());
		return Exists(_fromJoinWithInstrument, _joinCondition, $"c.course_type = 'Instrument' AND si.instrument_type = ANY(@{paramName})");
	}

	private static PredicateFragment StepTypeEquals(string paramName, DynamicParameters parameters, IReadOnlyList<string> values)
	{
		parameters.Add(paramName, values[0]);
		return Exists(
			_fromJoinWithInstrument,
			_joinCondition,
			$"c.course_type IN ('Instrument','Theory') AND si.step_type = @{paramName}");
	}

	private static PredicateFragment StepTypeIn(string paramName, DynamicParameters parameters, IReadOnlyList<string> values)
	{
		parameters.Add(paramName, values.ToArray());
		return Exists(
			_fromJoinWithInstrument,
			_joinCondition,
			$"c.course_type IN ('Instrument','Theory') AND si.step_type = ANY(@{paramName})");
	}

	private static PredicateFragment TeacherEquals(string paramName, DynamicParameters parameters, IReadOnlyList<string> values)
	{
		parameters.Add(paramName, Guid.Parse(values[0]));
		return Exists(_fromJoin, _joinCondition, $"sc.teacher_id = @{paramName}");
	}

	private static PredicateFragment TeacherIn(string paramName, DynamicParameters parameters, IReadOnlyList<string> values)
	{
		parameters.Add(paramName, values.Select(Guid.Parse).ToArray());
		return Exists(_fromJoin, _joinCondition, $"sc.teacher_id = ANY(@{paramName})");
	}
}