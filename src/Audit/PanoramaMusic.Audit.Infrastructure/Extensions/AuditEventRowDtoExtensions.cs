using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Audit.Infrastructure.Dtos;
using System.Text.Json;

namespace PanoramaMusic.Audit.Infrastructure.Extensions;

internal static class AuditEventRowDtoExtensions
{
	internal static AuditEvent MapToAuditEvent(this AuditEventRowDto dto) =>
		new(
			dto.Id,
			dto.Occurred_At,
			dto.Event_Type,
			dto.Actor_Id,
			dto.Actor_Email,
			dto.Target_Id,
			dto.Source_Ip,
			dto.User_Agent,
			dto.Correlation_Id,
			dto.Outcome,
			dto.Reason,
			JsonSerializer.Deserialize<Dictionary<string, object?>>(dto.Detail) ?? []);
}