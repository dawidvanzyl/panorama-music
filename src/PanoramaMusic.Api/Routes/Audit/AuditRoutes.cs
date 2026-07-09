using PanoramaMusic.Api.Filters;
using PanoramaMusic.Audit.Application.Handlers;
using PanoramaMusic.Audit.Application.Models;
using PanoramaMusic.Audit.Application.Requests;

namespace PanoramaMusic.Api.Routes.Audit;

public static class AuditRoutes
{
	public static void MapAuditRoutes(this WebApplication app)
	{
		var group = app
			.MapGroup("/api/audit")
			.WithTags("Audit")
			.RequireAuthorization("AdminPolicy");

		group
			.MapGet("/", async ([AsParameters] GetAuditEventsRequest request, GetAuditEventsHandler handler, CancellationToken ct) =>
			{
				var result = await handler.HandleAsync(request, ct);
				return Results.Ok(result);
			})
			.AddEndpointFilter<ValidationFilter<GetAuditEventsRequest>>()
			.WithName("GetAuditEvents")
			.Produces<GetAuditEventsResult>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden);
	}
}