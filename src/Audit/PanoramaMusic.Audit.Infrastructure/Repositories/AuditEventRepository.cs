using Dapper;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Audit.Domain.Interfaces;
using PanoramaMusic.Audit.Infrastructure.Dtos;
using PanoramaMusic.Audit.Infrastructure.Extensions;
using PanoramaMusic.Audit.Infrastructure.Repositories.Bases;
using PanoramaMusic.Persistence.Transactions;
using System.Text.Json;

namespace PanoramaMusic.Audit.Infrastructure.Repositories;

public class AuditEventRepository(IUnitOfWork unitOfWork) : RepositoryBase, IAuditLogger, IAuditEventReader
{
	public async Task CreateAsync(AuditEvent auditEvent, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"audit.create_audit_event",
			new
			{
				p_id = auditEvent.Id,
				p_occurred_at = auditEvent.OccurredAt,
				p_event_type = auditEvent.EventType,
				p_actor_id = auditEvent.ActorId,
				p_actor_email = auditEvent.ActorEmail,
				p_target_id = auditEvent.TargetId,
				p_source_ip = auditEvent.SourceIp,
				p_user_agent = auditEvent.UserAgent,
				p_correlation_id = auditEvent.CorrelationId,
				p_outcome = auditEvent.Outcome,
				p_reason = auditEvent.Reason,
				p_detail = JsonSerializer.Serialize(auditEvent.Detail),
			},
			unitOfWork.Transaction,
			cancellationToken);
		await unitOfWork.Connection.ExecuteAsync(command);
	}

	public async Task<AuditEventPage> GetPagedAsync(AuditEventFilter filter, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"audit.get_audit_events",
			new
			{
				p_actor_email = filter.ActorEmail,
				p_event_type = filter.EventType,
				p_from = filter.From,
				p_to = filter.To,
				p_page = filter.Page,
				p_page_size = filter.PageSize,
			},
			unitOfWork.Transaction,
			cancellationToken);

		var rows = (await unitOfWork.Connection.QueryAsync<AuditEventRowDto>(command)).AsList();
		var totalCount = rows.Count > 0 ? (int)rows[0].Total_Count : 0;
		return new AuditEventPage([.. rows.Select(dto => dto.MapToAuditEvent())], totalCount);
	}
}