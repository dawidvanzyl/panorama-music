using PanoramaMusic.Api.Extensions;
using PanoramaMusic.Api.Filters;
using PanoramaMusic.Reporting.Application.Handlers;
using PanoramaMusic.Reporting.Application.Models;
using PanoramaMusic.Reporting.Application.Requests;

namespace PanoramaMusic.Api.Routes.Reporting;

public static class ReportRoutes
{
	public static void MapReportRoutes(this WebApplication app)
	{
		var group = app
			.MapGroup("/api/reports")
			.WithTags("Reports")
			.RequireAuthorization("TeacherPolicy");

		group
			.MapGet("/fields", (GetReportFieldsHandler handler) => Results.Ok(handler.Handle()))
			.WithName("GetReportFields")
			.Produces<ReportFieldsResult>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden);

		group
			.MapPost("/run", async (RunReportRequest request, RunReportHandler handler, CancellationToken ct) =>
			{
				var result = await handler.HandleAsync(request, ct);
				return Results.Ok(result);
			})
			.AddEndpointFilter<ValidationFilter<RunReportRequest>>()
			.MarkSensitiveResponse()
			.WithName("RunReport")
			.Produces<ReportRunResult>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden);
	}
}