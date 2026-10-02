using Dapper;
using PanoramaMusic.Persistence.Interfaces;
using PanoramaMusic.Persistence.Transactions;
using PanoramaMusic.Reporting.Domain.Entities;
using PanoramaMusic.Reporting.Domain.Interfaces;
using PanoramaMusic.Reporting.Domain.ValueObjects;
using PanoramaMusic.Reporting.Infrastructure.Dtos;
using PanoramaMusic.Reporting.Infrastructure.Extensions;
using PanoramaMusic.Reporting.Infrastructure.Repositories.Bases;

namespace PanoramaMusic.Reporting.Infrastructure.Repositories;

public sealed class SavedReportRepository(IUnitOfWork unitOfWork, IDomainEventCollector domainEventCollector)
	: RepositoryBase(unitOfWork), ISavedReportRepository
{
	public async Task CreateAsync(SavedReport report, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"reporting.create_saved_report",
			new
			{
				p_saved_report_id = report.SavedReportId,
				p_name = report.Name,
				p_definition = report.Definition.ToJson(),
				p_created_by = report.CreatedBy,
				p_created_at = report.CreatedAt,
			},
			Transaction,
			cancellationToken);
		await Connection.ExecuteAsync(command);

		domainEventCollector.Collect(report);
	}

	public async Task<IReadOnlyList<SavedReportRecord>> GetAllAsync(CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition("reporting.get_saved_reports", null, Transaction, cancellationToken);
		var dtos = await Connection.QueryAsync<SavedReportDto>(command);

		return [.. dtos.Select(dto => dto.MapToSavedReportRecord())];
	}

	public async Task<SavedReportRecord?> GetByIdAsync(Guid savedReportId, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"reporting.get_saved_report_by_id",
			new { p_saved_report_id = savedReportId },
			Transaction,
			cancellationToken);
		var dto = await Connection.QuerySingleOrDefaultAsync<SavedReportDto>(command);

		return dto?.MapToSavedReportRecord();
	}

	public async Task UpdateLastRunAsync(SavedReport report, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"reporting.update_saved_report_last_run",
			new
			{
				p_saved_report_id = report.SavedReportId,
				p_last_run_at = report.LastRunAt,
			},
			Transaction,
			cancellationToken);
		await Connection.ExecuteAsync(command);

		domainEventCollector.Collect(report);
	}

	public async Task UpdateAsync(SavedReport report, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"reporting.update_saved_report",
			new
			{
				p_saved_report_id = report.SavedReportId,
				p_name = report.Name,
				p_definition = report.Definition.ToJson(),
			},
			Transaction,
			cancellationToken);
		await Connection.ExecuteAsync(command);

		domainEventCollector.Collect(report);
	}

	public async Task DeleteAsync(SavedReport report, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"reporting.delete_saved_report_by_id",
			new { p_saved_report_id = report.SavedReportId },
			Transaction,
			cancellationToken);
		await Connection.ExecuteAsync(command);

		domainEventCollector.Collect(report);
	}
}