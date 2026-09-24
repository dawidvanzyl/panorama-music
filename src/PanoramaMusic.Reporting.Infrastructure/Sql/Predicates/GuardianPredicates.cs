using Dapper;
using PanoramaMusic.Reporting.Domain.Enums;
using static PanoramaMusic.Reporting.Infrastructure.Sql.Predicates.CollectionExistsPredicate;

namespace PanoramaMusic.Reporting.Infrastructure.Sql.Predicates;

/// <summary>The Guardian collection's filter predicates, keyed exactly as the registry declares them.</summary>
internal static class GuardianPredicates
{
	private const string _fromJoin =
		"FROM students.student_guardians sg JOIN students.guardians g ON g.guardian_id = sg.guardian_id";

	private const string _joinCondition = "sg.student_id = s.student_id";

	public static IReadOnlyDictionary<(string Field, FilterOperator Operator), StudentSqlCatalog.PredicateBuilder> Build() =>
		new Dictionary<(string, FilterOperator), StudentSqlCatalog.PredicateBuilder>
		{
			[("guardian.name", FilterOperator.Equals)] = NameEquals,
			[("guardian.name", FilterOperator.Contains)] = NameContains,
			[("guardian.relationship", FilterOperator.Equals)] = RelationshipEquals,
			[("guardian.relationship", FilterOperator.In)] = RelationshipIn,
			[("guardian.receivesCorrespondence", FilterOperator.Equals)] = BooleanEquals("g.receives_correspondence"),
			[("guardian.responsibleForPayment", FilterOperator.Equals)] = BooleanEquals("g.responsible_for_payment"),
			[("guardian.married", FilterOperator.Equals)] = BooleanEquals("g.married"),
		};

	private static PredicateFragment NameEquals(string paramName, DynamicParameters parameters, IReadOnlyList<string> values)
	{
		parameters.Add(paramName, values[0]);
		return Exists(_fromJoin, _joinCondition, $"lower(g.first_name || ' ' || g.surname) = lower(@{paramName})");
	}

	private static PredicateFragment NameContains(string paramName, DynamicParameters parameters, IReadOnlyList<string> values)
	{
		parameters.Add(paramName, values[0]);
		return Exists(_fromJoin, _joinCondition, $"strpos(lower(g.first_name || ' ' || g.surname), lower(@{paramName})) > 0");
	}

	private static PredicateFragment RelationshipEquals(string paramName, DynamicParameters parameters, IReadOnlyList<string> values)
	{
		parameters.Add(paramName, Guid.Parse(values[0]));
		return Exists(_fromJoin, _joinCondition, $"g.guardian_relationship_id = @{paramName}");
	}

	private static PredicateFragment RelationshipIn(string paramName, DynamicParameters parameters, IReadOnlyList<string> values)
	{
		parameters.Add(paramName, values.Select(Guid.Parse).ToArray());
		return Exists(_fromJoin, _joinCondition, $"g.guardian_relationship_id = ANY(@{paramName})");
	}

	private static StudentSqlCatalog.PredicateBuilder BooleanEquals(string column) => (paramName, parameters, values) =>
	{
		parameters.Add(paramName, values[0] == "Yes");
		return Exists(_fromJoin, _joinCondition, $"{column} = @{paramName}");
	};
}