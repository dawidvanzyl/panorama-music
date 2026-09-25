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
			.MapGet("/fields", async (GetReportFieldsHandler handler, CancellationToken ct) => Results.Ok(await handler.HandleAsync(ct)))
			.MarkSensitiveResponse()
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

		group
			.MapPost("/", async (SaveReportRequest request, SaveReportHandler handler, CancellationToken ct) =>
			{
				var result = await handler.HandleAsync(request, ct);
				return Results.Created($"/api/reports/{result.Id}", result);
			})
			.AddEndpointFilter<ValidationFilter<SaveReportRequest>>()
			.MarkSensitiveResponse()
			.WithName("SaveReport")
			.Produces<SavedReportResult>(StatusCodes.Status201Created)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden);

		group
			.MapGet("/", async (GetSavedReportsHandler handler, CancellationToken ct) => Results.Ok(await handler.HandleAsync(ct)))
			.MarkSensitiveResponse()
			.WithName("GetSavedReports")
			.Produces<IReadOnlyList<SavedReportSummaryResult>>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden);

		group
			.MapGet("/{id:guid}", async (Guid id, GetSavedReportHandler handler, CancellationToken ct) => Results.Ok(await handler.HandleAsync(id, ct)))
			.MarkSensitiveResponse()
			.WithName("GetSavedReport")
			.Produces<SavedReportDetailResult>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);

		group
			.MapPost("/{id:guid}/run", async (Guid id, RunSavedReportHandler handler, CancellationToken ct) => Results.Ok(await handler.HandleAsync(id, ct)))
			.MarkSensitiveResponse()
			.WithName("RunSavedReport")
			.Produces<SavedReportRunResult>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);
	}
}