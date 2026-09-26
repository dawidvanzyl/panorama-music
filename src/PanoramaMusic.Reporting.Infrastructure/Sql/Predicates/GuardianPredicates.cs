using Dapper;
using PanoramaMusic.Reporting.Domain.Enums;

namespace PanoramaMusic.Reporting.Infrastructure.Sql.Predicates;

/// <summary>The Guardian collection's filter predicates, keyed exactly as the registry declares them.</summary>
internal static class GuardianPredicates
{
	public static CollectionScope Scope { get; } = new(
		"FROM students.student_guardians sg JOIN students.guardians g ON g.guardian_id = sg.guardian_id",
		"sg.student_id = s.student_id");

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
		return new PredicateFragment($"lower(g.first_name || ' ' || g.surname) = lower(@{paramName})", false);
	}

	private static PredicateFragment NameContains(string paramName, DynamicParameters parameters, IReadOnlyList<string> values)
	{
		parameters.Add(paramName, values[0]);
		return new PredicateFragment($"strpos(lower(g.first_name || ' ' || g.surname), lower(@{paramName})) > 0", false);
	}

	private static PredicateFragment RelationshipEquals(string paramName, DynamicParameters parameters, IReadOnlyList<string> values)
	{
		parameters.Add(paramName, Guid.Parse(values[0]));
		return new PredicateFragment($"g.guardian_relationship_id = @{paramName}", false);
	}

	private static PredicateFragment RelationshipIn(string paramName, DynamicParameters parameters, IReadOnlyList<string> values)
	{
		parameters.Add(paramName, values.Select(Guid.Parse).ToArray());
		return new PredicateFragment($"g.guardian_relationship_id = ANY(@{paramName})", false);
	}

	private static StudentSqlCatalog.PredicateBuilder BooleanEquals(string column) => (paramName, parameters, values) =>
	{
		parameters.Add(paramName, values[0] == "Yes");
		return new PredicateFragment($"{column} = @{paramName}", false);
	};
}