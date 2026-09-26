using Dapper;
using PanoramaMusic.Persistence.Transactions;
using PanoramaMusic.Reporting.Domain.Enums;
using PanoramaMusic.Reporting.Domain.Interfaces;
using PanoramaMusic.Reporting.Domain.ValueObjects;
using PanoramaMusic.Reporting.Infrastructure.Extensions;
using PanoramaMusic.Reporting.Infrastructure.Sql;
using System.Data;

namespace PanoramaMusic.Reporting.Infrastructure.Readers;

/// <summary>
/// The issue's sanctioned exception to "repositories call PostgreSQL
/// functions": composes the population SQL at run time, but every fragment
/// comes from <see cref="StudentSqlCatalog"/>, composed by
/// <see cref="ReportPredicateComposer"/> over the collection scopes, and
/// every value is bound through <see cref="DynamicParameters"/> — no request
/// text is ever concatenated into the SQL. Resolves its connection and
/// transaction only from <see cref="IUnitOfWork"/>; begins or commits nothing.
/// </summary>
public sealed class PopulationReader(IUnitOfWork unitOfWork, StudentSqlCatalog catalog, ReportPredicateComposer composer) : IPopulationReader
{
	private const string _siblingStatsCte = """
		WITH sibling_stats AS (
		    SELECT sl.student_id, COUNT(*) AS sibling_count,
		           BOOL_AND(o.date_of_birth >= me.date_of_birth) AS none_older
		    FROM students.siblings sl
		    JOIN students.students o  ON o.student_id  = sl.sibling_id
		    JOIN students.students me ON me.student_id = sl.student_id
		    GROUP BY sl.student_id
		)
		""";

	public async Task<IReadOnlyList<PopulationMember>> ReadAsync(ReportDefinition definition, CancellationToken cancellationToken)
	{
		var studentColumns = definition.Columns.Where(column => column.Collection == ReportCollection.Student).ToList();
		var sourceNames = studentColumns.SelectMany(column => column.Sources).Distinct().ToList();

		var aliasToSource = new Dictionary<string, string>(sourceNames.Count);
		var selectClauses = new List<string>(sourceNames.Count);
		var needsSiblingStats = false;

		for (var i = 0; i < sourceNames.Count; i++)
		{
			var alias = $"c{i}";
			var source = catalog.Sources[sourceNames[i]];
			selectClauses.Add($"{source.SelectExpression} AS {alias}");
			aliasToSource[alias] = sourceNames[i];
			needsSiblingStats |= source.RequiresSiblingStats;
		}

		var parameters = new DynamicParameters();
		var whereClauses = new List<string>();
		foreach (var fragment in composer.ComposePopulationPredicates(definition.Filters, parameters))
		{
			whereClauses.Add(fragment.Sql);
			needsSiblingStats |= fragment.RequiresSiblingStats;
		}

		var cte = needsSiblingStats ? _siblingStatsCte : string.Empty;
		var siblingJoin = needsSiblingStats ? "LEFT JOIN sibling_stats ss ON ss.student_id = s.student_id" : string.Empty;
		var selectList = selectClauses.Count > 0 ? ", " + string.Join(", ", selectClauses) : string.Empty;
		var whereList = whereClauses.Count > 0 ? " AND " + string.Join(" AND ", whereClauses) : string.Empty;

		var sql = $"""
			{cte}
			SELECT s.student_id{selectList}
			FROM students.students s
			{siblingJoin}
			WHERE students.student_population(s.student_id) = 'Enrolled'{whereList}
			ORDER BY lower(s.first_name), lower(s.last_name), s.grade, s.class NULLS LAST, s.student_id
			""";

		var command = new CommandDefinition(sql, parameters, unitOfWork.Transaction, commandType: CommandType.Text, cancellationToken: cancellationToken);
		var rows = await unitOfWork.Connection.QueryAsync(command);

		return [.. rows.Select(row => ((IDictionary<string, object>)row).ToPopulationMember(aliasToSource))];
	}
}