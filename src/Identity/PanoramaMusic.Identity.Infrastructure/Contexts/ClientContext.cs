using Microsoft.AspNetCore.Http;
using PanoramaMusic.Identity.Application.Interfaces;

namespace PanoramaMusic.Identity.Infrastructure.Contexts;

public sealed class ClientContext(IHttpContextAccessor accessor) : IClientContext
{
	public string? UserAgent => accessor.HttpContext?.Request.Headers.UserAgent.ToString() is { Length: > 0 } value ? value : null;

	public string? IpAddress => accessor.HttpContext?.Connection.RemoteIpAddress?.ToString();
}