using Dapper;
using PanoramaMusic.Persistence.Transactions;
using PanoramaMusic.Reporting.Domain.Enums;
using PanoramaMusic.Reporting.Domain.Interfaces;
using PanoramaMusic.Reporting.Domain.ValueObjects;
using PanoramaMusic.Reporting.Infrastructure.Extensions;
using PanoramaMusic.Reporting.Infrastructure.Sql;
using System.Data;

namespace PanoramaMusic.Reporting.Infrastructure.Readers;

/// <summary>Reads the population's Course records that satisfy every Course filter, in one set-based query.</summary>
public sealed class CourseCollectionReader(IUnitOfWork unitOfWork, ReportPredicateComposer composer) : ICollectionReader
{
	public ReportCollection Collection => ReportCollection.Course;

	public async Task<IReadOnlyList<CollectionRecord>> ReadAsync(
		IReadOnlyCollection<Guid> studentIds,
		IReadOnlyList<ColumnAttribute> columns,
		IReadOnlyList<ReportFilter> filters,
		CancellationToken cancellationToken)
	{
		var parameters = new DynamicParameters();
		parameters.Add("studentIds", studentIds.ToArray());
		var condition = composer.ComposeRecordCondition(Collection, filters, parameters);

		var command = new CommandDefinition(
			CourseCollectionSql.Compose(condition), parameters, unitOfWork.Transaction, commandType: CommandType.Text, cancellationToken: cancellationToken);
		var rows = await unitOfWork.Connection.QueryAsync(command);

		return [.. rows.Select(row => ((IDictionary<string, object>)row).ToCollectionRecord(CourseCollectionSql.Sources))];
	}
}