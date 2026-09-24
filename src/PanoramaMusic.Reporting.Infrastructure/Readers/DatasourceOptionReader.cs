using Dapper;
using PanoramaMusic.Persistence.Transactions;
using PanoramaMusic.Reporting.Domain.Enums;
using PanoramaMusic.Reporting.Domain.Interfaces;
using PanoramaMusic.Reporting.Domain.ValueObjects;
using PanoramaMusic.Reporting.Infrastructure.Extensions;
using System.Data;

namespace PanoramaMusic.Reporting.Infrastructure.Readers;

/// <summary>
/// Reads a Datasource-typed filter's live options through the usual
/// PostgreSQL-function convention, for listing and for validating a
/// submitted value.
/// </summary>
public sealed class DatasourceOptionReader(IUnitOfWork unitOfWork) : IDatasourceOptionReader
{
	public Task<IReadOnlyList<FieldOption>> ReadAsync(ReportDatasource datasource, CancellationToken cancellationToken) => datasource switch
	{
		ReportDatasource.GuardianRelationship => ReadGuardianRelationshipsAsync(cancellationToken),
		ReportDatasource.Teacher => ReadTeachersAsync(cancellationToken),
		ReportDatasource.ExtraCurricular => ReadExtraCurricularsAsync(cancellationToken),
		_ => throw new InvalidOperationException($"No datasource reader is registered for {datasource}."),
	};

	private async Task<IReadOnlyList<FieldOption>> ReadGuardianRelationshipsAsync(CancellationToken cancellationToken)
	{
		var command = new CommandDefinition(
			"students.get_guardian_relationships", transaction: unitOfWork.Transaction, commandType: CommandType.StoredProcedure, cancellationToken: cancellationToken);
		var rows = await unitOfWork.Connection.QueryAsync(command);

		return [.. rows.Select(row => ((IDictionary<string, object>)row).ToGuardianRelationshipOption())];
	}

	private async Task<IReadOnlyList<FieldOption>> ReadTeachersAsync(CancellationToken cancellationToken)
	{
		var command = new CommandDefinition(
			"teachers.get_teacher_names", transaction: unitOfWork.Transaction, commandType: CommandType.StoredProcedure, cancellationToken: cancellationToken);
		var rows = await unitOfWork.Connection.QueryAsync(command);

		return [.. rows.Select(row => ((IDictionary<string, object>)row).ToTeacherOption())];
	}

	/// <summary>
	/// <c>get_extra_curriculars(NULL)</c> returns one row per practice time, so
	/// its rows are collapsed to distinct activities by id, ordered by
	/// description then phase.
	/// </summary>
	private async Task<IReadOnlyList<FieldOption>> ReadExtraCurricularsAsync(CancellationToken cancellationToken)
	{
		var command = new CommandDefinition(
			"students.get_extra_curriculars",
			new { p_phase = (string?)null },
			unitOfWork.Transaction,
			commandType: CommandType.StoredProcedure,
			cancellationToken: cancellationToken);
		var rows = (await unitOfWork.Connection.QueryAsync(command)).Select(row => (IDictionary<string, object>)row).ToList();

		return [.. rows
			.DistinctBy(row => row.ExtraCurricularId())
			.OrderBy(row => (string)row["description"], StringComparer.Ordinal)
			.ThenBy(row => (string)row["phase"], StringComparer.Ordinal)
			.Select(row => row.ToExtraCurricularOption())];
	}
}