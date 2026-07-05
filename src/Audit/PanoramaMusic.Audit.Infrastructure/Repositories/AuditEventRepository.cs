using Dapper;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Audit.Infrastructure.Factories;
using PanoramaMusic.Audit.Infrastructure.Repositories.Bases;
using System.Text.Json;

namespace PanoramaMusic.Audit.Infrastructure.Repositories;

public class AuditEventRepository(IDbConnectionFactory connectionFactory) : RepositoryBase(connectionFactory), IAuditLogger
{
	public async Task LogAsync(AuditEvent auditEvent, CancellationToken cancellationToken)
	{
		using var connection = CreateConnection();
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
			cancellationToken);
		await connection.ExecuteAsync(command);
	}
}