using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using System.Net;

namespace PanoramaMusic.Api.Tests.Middleware;

/// <summary>
/// TestServer gives every request the same connection identity, so per-IP rate-limiting
/// scenarios can't vary the source IP through real network behaviour. This filter, registered
/// only in the test host, lets tests fake a distinct <see cref="HttpContext.Connection"/> remote
/// IP via the <see cref="HeaderName"/> header, ahead of the app's own middleware pipeline.
/// </summary>
public sealed class TestRemoteIpStartupFilter : IStartupFilter
{
	public const string HeaderName = "X-Test-Remote-Ip";

	public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next) => app =>
	{
		app.Use((context, nextMiddleware) =>
		{
			if (context.Request.Headers.TryGetValue(HeaderName, out var ip) && IPAddress.TryParse(ip.ToString(), out var parsed))
			{
				context.Connection.RemoteIpAddress = parsed;
			}

			return nextMiddleware();
		});

		next(app);
	};
}