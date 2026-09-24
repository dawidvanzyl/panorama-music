using Dapper;
using PanoramaMusic.Reporting.Domain.Enums;

namespace PanoramaMusic.Reporting.Infrastructure.Sql;

/// <summary>
/// The SQL half of the Student registry allowlist: every identifier and
/// operator fragment <see cref="Domain.Registries.StudentFieldRegistry"/>'s
/// keys and source names resolve to. Every user-supplied value is bound
/// through <see cref="DynamicParameters"/> — nothing here ever concatenates
/// request text into a fragment. A parity check (registered at startup and in
/// a test, 317UC3) keeps this catalog and the Domain registry in lock step.
/// </summary>
public sealed class StudentSqlCatalog
{
	public delegate PredicateFragment PredicateBuilder(string paramName, DynamicParameters parameters, IReadOnlyList<string> values);

	private readonly Dictionary<(string Field, FilterOperator Operator), PredicateBuilder> _predicates;

	public StudentSqlCatalog()
	{
		Sources = new Dictionary<string, SourceExpression>
		{
			["firstName"] = new("s.first_name", false),
			["lastName"] = new("s.last_name", false),
			["dateOfBirth"] = new("s.date_of_birth", false),
			["grade"] = new("s.grade", false),
			["class"] = new("s.class", false),
			["phase"] = new("s.phase", false),
			["language"] = new("s.language", false),
			["siblingCount"] = new("COALESCE(ss.sibling_count,0)", true),
			["isEldest"] = new("(COALESCE(ss.sibling_count,0) > 0 AND COALESCE(ss.none_older,false))", true),
		};

		_predicates = new Dictionary<(string, FilterOperator), PredicateBuilder>
		{
			[("student.name", FilterOperator.Contains)] = NameContains,
			[("student.name", FilterOperator.Equals)] = NameEquals,
			[("student.grade", FilterOperator.Equals)] = ColumnEquals("grade"),
			[("student.grade", FilterOperator.In)] = ColumnIn("grade"),
			[("student.phase", FilterOperator.Equals)] = ColumnEquals("phase"),
			[("student.phase", FilterOperator.In)] = ColumnIn("phase"),
			[("student.class", FilterOperator.Equals)] = ColumnEquals("class"),
			[("student.class", FilterOperator.In)] = ColumnIn("class"),
			[("student.language", FilterOperator.Equals)] = ColumnEquals("language"),
			[("student.language", FilterOperator.In)] = ColumnIn("language"),
			[("student.hasSiblings", FilterOperator.Equals)] = HasSiblingsEquals,
			[("student.isEldest", FilterOperator.Equals)] = IsEldestEquals,
		};
	}

	/// <summary>Logical source name -> its select expression and whether it needs the sibling-stats CTE.</summary>
	public IReadOnlyDictionary<string, SourceExpression> Sources { get; }

	/// <summary>Every (filter key, operator) pair this catalog can build a predicate for.</summary>
	public IReadOnlyCollection<(string Field, FilterOperator Operator)> PredicateKeys => _predicates.Keys;

	public PredicateBuilder? TryGetPredicateBuilder(string field, FilterOperator op) =>
		_predicates.GetValueOrDefault((field, op));

	private static PredicateFragment NameContains(string paramName, DynamicParameters parameters, IReadOnlyList<string> values)
	{
		parameters.Add(paramName, values[0]);
		return new PredicateFragment($"strpos(lower(s.first_name || ' ' || s.last_name), lower(@{paramName})) > 0", false);
	}

	private static PredicateFragment NameEquals(string paramName, DynamicParameters parameters, IReadOnlyList<string> values)
	{
		parameters.Add(paramName, values[0]);
		return new PredicateFragment($"lower(s.first_name || ' ' || s.last_name) = lower(@{paramName})", false);
	}

	private static PredicateBuilder ColumnEquals(string column) => (paramName, parameters, values) =>
	{
		parameters.Add(paramName, values[0]);
		return new PredicateFragment($"s.{column} = @{paramName}", false);
	};

	private static PredicateBuilder ColumnIn(string column) => (paramName, parameters, values) =>
	{
		parameters.Add(paramName, values.ToArray());
		return new PredicateFragment($"s.{column} = ANY(@{paramName})", false);
	};

	private static PredicateFragment HasSiblingsEquals(string paramName, DynamicParameters parameters, IReadOnlyList<string> values)
	{
		parameters.Add(paramName, values[0] == "Yes");
		return new PredicateFragment($"(COALESCE(ss.sibling_count,0) > 0) = @{paramName}", true);
	}

	private static PredicateFragment IsEldestEquals(string paramName, DynamicParameters parameters, IReadOnlyList<string> values)
	{
		parameters.Add(paramName, values[0] == "Yes");
		return new PredicateFragment(
			$"(COALESCE(ss.sibling_count,0) > 0 AND COALESCE(ss.none_older,false)) = @{paramName}", true);
	}
}