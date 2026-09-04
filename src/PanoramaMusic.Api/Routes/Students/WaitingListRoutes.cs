using PanoramaMusic.Api.Extensions;
using PanoramaMusic.Api.Filters;
using PanoramaMusic.Students.Application.Commands.WaitingList;
using PanoramaMusic.Students.Application.Handlers.WaitingList;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Application.Requests.WaitingList;

namespace PanoramaMusic.Api.Routes.Students;

public static class WaitingListRoutes
{
	public static void MapWaitingListRoutes(this WebApplication app)
	{
		app
			.MapGroup("/api/waiting-list")
			.WithTags("WaitingList")
			.RequireAuthorization("TeacherOrCoordinatorPolicy")
			.MapGet("/", async (GetWaitingListHandler handler, CancellationToken ct) =>
			{
				var result = await handler.HandleAsync(ct);
				return Results.Ok(result);
			})
			.WithName("GetWaitingList")
			// Each row names a student and may carry their notes — sensitive on the
			// same terms as GetStudents.
			.MarkSensitiveResponse()
			.Produces<IList<WaitingListGroupResult>>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden);

		// Capture is the only way onto the waiting list, and it is Coordinator-only
		// — a Teacher gets no affordance for it and is refused by the endpoint too.
		app
			.MapGroup("/api/waiting-list")
			.WithTags("WaitingList")
			.RequireAuthorization("CoordinatorPolicy")
			.MapPost("/", async (CaptureWaitingListStudentRequest request, CaptureWaitingListStudentHandler handler, CancellationToken ct) =>
			{
				var command = new CaptureWaitingListStudentCommand(request);
				var result = await handler.HandleAsync(command, ct);
				return Results.Created($"/api/waiting-list/{result.WaitingListEntryId}", result);
			})
			.AddEndpointFilter<ValidationFilter<CaptureWaitingListStudentRequest>>()
			.MarkSensitiveResponse()
			.WithName("CaptureWaitingListStudent")
			.Produces<WaitingListEntryResult>(StatusCodes.Status201Created)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden);
	}
}