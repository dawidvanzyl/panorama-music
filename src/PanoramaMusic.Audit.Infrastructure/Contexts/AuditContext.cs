using Microsoft.AspNetCore.Http;
using PanoramaMusic.Audit.Application.Interfaces;

namespace PanoramaMusic.Audit.Infrastructure.Contexts;

public sealed class AuditContext(IHttpContextAccessor accessor) : IAuditContext
{
	// Mirrors CorrelationIdMiddleware.ItemKey in the Api layer — Infrastructure
	// cannot reference Api, so the key is duplicated by contract.
	private const string _correlationIdItemKey = "CorrelationId";

	private const string _unknown = "unknown";
	private const int _maxUserAgentLength = 256;

	public string SourceIp =>
		accessor.HttpContext?.Connection.RemoteIpAddress?.ToString() ?? _unknown;

	public string UserAgent =>
		accessor.HttpContext?.Request.Headers.UserAgent.ToString() is { Length: > 0 } value
			? value[..Math.Min(value.Length, _maxUserAgentLength)]
			: _unknown;

	public Guid CorrelationId =>
		accessor.HttpContext?.Items.TryGetValue(_correlationIdItemKey, out var value) == true
			&& Guid.TryParse(value as string, out var correlationId)
			? correlationId
			: Guid.Empty;
}