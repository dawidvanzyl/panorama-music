using Microsoft.AspNetCore.Http;
using PanoramaMusic.Identity.Application.Interfaces;

namespace PanoramaMusic.Identity.Infrastructure.Contexts;

public sealed class ClientContext(IHttpContextAccessor accessor) : IClientContext
{
	private const int _maxUserAgentLength = 256;

	public string? UserAgent =>
		accessor.HttpContext?.Request.Headers.UserAgent.ToString() is { Length: > 0 } value
			? value[..Math.Min(value.Length, _maxUserAgentLength)]
			: null;

	public string? IpAddress => accessor.HttpContext?.Connection.RemoteIpAddress?.ToString();
}