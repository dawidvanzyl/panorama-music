using Dapper;
using PanoramaMusic.Persistence.Transactions;
using PanoramaMusic.Reporting.Domain.Enums;
using PanoramaMusic.Reporting.Domain.Interfaces;
using PanoramaMusic.Reporting.Domain.ValueObjects;
using PanoramaMusic.Reporting.Infrastructure.Extensions;
using PanoramaMusic.Reporting.Infrastructure.Sql;
using System.Data;

namespace PanoramaMusic.Reporting.Infrastructure.Readers;

/// <summary>Reads every Guardian record of a whole population in one set-based query.</summary>
public sealed class GuardianCollectionReader(IUnitOfWork unitOfWork) : ICollectionReader
{
	public ReportCollection Collection => ReportCollection.Guardian;

	public async Task<IReadOnlyList<CollectionRecord>> ReadAsync(
		IReadOnlyCollection<Guid> studentIds,
		IReadOnlyList<ColumnAttribute> columns,
		CancellationToken cancellationToken)
	{
		var parameters = new DynamicParameters();
		parameters.Add("studentIds", studentIds.ToArray());

		var command = new CommandDefinition(
			GuardianCollectionSql.Query, parameters, unitOfWork.Transaction, commandType: CommandType.Text, cancellationToken: cancellationToken);
		var rows = await unitOfWork.Connection.QueryAsync(command);

		return [.. rows.Select(row => ((IDictionary<string, object>)row).ToCollectionRecord(GuardianCollectionSql.Sources))];
	}
}