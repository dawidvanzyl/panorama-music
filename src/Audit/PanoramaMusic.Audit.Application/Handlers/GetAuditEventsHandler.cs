using PanoramaMusic.Audit.Application.Models;
using PanoramaMusic.Audit.Application.Requests;
using PanoramaMusic.Audit.Application.Resolvers;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Audit.Domain.Interfaces;
using System.Text.Json;

namespace PanoramaMusic.Audit.Application.Handlers;

public sealed class GetAuditEventsHandler(IAuditEventReader auditEventReader)
{
	private const string _targetDisplayKey = "targetDisplay";

	public async Task<GetAuditEventsResult> HandleAsync(GetAuditEventsRequest request, CancellationToken cancellationToken)
	{
		AuditToDateResolver.TryResolveInclusiveUpperBound(request.To, out var resolvedTo);
		var filter = new AuditEventFilter(
			request.Actor,
			request.EventType,
			request.From,
			resolvedTo,
			request.Page,
			request.PageSize);

		var page = await auditEventReader.GetPagedAsync(filter, cancellationToken);
		var items = page.Items.Select(ToSummary).ToList();

		return new GetAuditEventsResult(
			items,
			page.TotalCount,
			request.Page,
			request.PageSize);
	}

	private static AuditEventSummary ToSummary(AuditEvent auditEvent)
	{
		return new(
			auditEvent.OccurredAt,
			auditEvent.EventType,
			auditEvent.ActorEmail,
			ResolveTargetDisplay(auditEvent.Detail),
			auditEvent.Outcome,
			auditEvent.Reason,
			auditEvent.SourceIp);
	}

	// Every producing context writes the same canonical "targetDisplay" key into its detail
	// bag, whatever the underlying value actually is (an email, a name, etc.) — this stays
	// completely agnostic of which context or entity type produced the event.
	private static string? ResolveTargetDisplay(IReadOnlyDictionary<string, object?> detail)
	{
		if (!detail.TryGetValue(_targetDisplayKey, out var value) || value is null)
			return null;

		// The detail bag is deserialized from stored JSONB, so string values
		// arrive as JsonElement rather than the original CLR string.
		return value switch
		{
			JsonElement { ValueKind: JsonValueKind.String } element => element.GetString(),
			JsonElement element => element.ToString(),
			_ => value.ToString(),
		};
	}
}