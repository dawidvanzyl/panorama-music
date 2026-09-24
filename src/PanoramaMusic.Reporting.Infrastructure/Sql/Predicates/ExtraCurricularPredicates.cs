using Dapper;
using PanoramaMusic.Reporting.Domain.Enums;
using static PanoramaMusic.Reporting.Infrastructure.Sql.Predicates.CollectionExistsPredicate;

namespace PanoramaMusic.Reporting.Infrastructure.Sql.Predicates;

/// <summary>The Extra-Curricular collection's filter predicates, keyed exactly as the registry declares them.</summary>
internal static class ExtraCurricularPredicates
{
	private const string _fromJoin =
		"FROM students.student_extra_curriculars sec " +
		"JOIN students.extra_curriculars ec ON ec.extra_curricular_id = sec.extra_curricular_id";

	private const string _joinCondition = "sec.student_id = s.student_id";

	public static IReadOnlyDictionary<(string Field, FilterOperator Operator), StudentSqlCatalog.PredicateBuilder> Build() =>
		new Dictionary<(string, FilterOperator), StudentSqlCatalog.PredicateBuilder>
		{
			[("extraCurricular.activity", FilterOperator.Equals)] = ActivityEquals,
			[("extraCurricular.activity", FilterOperator.In)] = ActivityIn,
			[("extraCurricular.phase", FilterOperator.Equals)] = PhaseEquals,
			[("extraCurricular.phase", FilterOperator.In)] = PhaseIn,
		};

	private static PredicateFragment ActivityEquals(string paramName, DynamicParameters parameters, IReadOnlyList<string> values)
	{
		parameters.Add(paramName, Guid.Parse(values[0]));
		return Exists(_fromJoin, _joinCondition, $"sec.extra_curricular_id = @{paramName}");
	}

	private static PredicateFragment ActivityIn(string paramName, DynamicParameters parameters, IReadOnlyList<string> values)
	{
		parameters.Add(paramName, values.Select(Guid.Parse).ToArray());
		return Exists(_fromJoin, _joinCondition, $"sec.extra_curricular_id = ANY(@{paramName})");
	}

	private static PredicateFragment PhaseEquals(string paramName, DynamicParameters parameters, IReadOnlyList<string> values)
	{
		parameters.Add(paramName, values[0]);
		return Exists(_fromJoin, _joinCondition, $"ec.phase = @{paramName}");
	}

	private static PredicateFragment PhaseIn(string paramName, DynamicParameters parameters, IReadOnlyList<string> values)
	{
		parameters.Add(paramName, values.ToArray());
		return Exists(_fromJoin, _joinCondition, $"ec.phase = ANY(@{paramName})");
	}
}
