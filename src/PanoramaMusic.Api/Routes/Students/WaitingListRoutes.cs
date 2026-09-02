using PanoramaMusic.Students.Application.Handlers.WaitingList;
using PanoramaMusic.Students.Application.Models;

namespace PanoramaMusic.Api.Routes.Students;

public static class WaitingListRoutes
{
	public static void MapWaitingListRoutes(this WebApplication app)
	{
		// Read-only for this story: a Teacher and a Coordinator may both read the
		// list. Capture, edit, delete and enrol arrive in later M9 stories, each
		// under its own, narrower policy — do not widen this one to admit them.
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
			.Produces<IList<WaitingListGroupResult>>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden);
	}
}
