using PanoramaMusic.Students.Application.Handlers.LessonStructures;
using PanoramaMusic.Students.Application.Models;

namespace PanoramaMusic.Api.Routes.Students;

public static class LessonStructureRoutes
{
	public static void MapLessonStructureRoutes(this WebApplication app)
	{
		// The seeded set is authoritative and is never maintained at runtime, so
		// the lookup is read-only. Every staff role needs it to pick a structure
		// when creating a course.
		app
			.MapGroup("/api/lesson-structures")
			.WithTags("Lesson Structures")
			.RequireAuthorization("TeacherCoordinatorOrAdminPolicy")
			.MapGet("/", async (GetLessonStructuresHandler handler, CancellationToken ct) =>
			{
				var result = await handler.HandleAsync(ct);
				return Results.Ok(result);
			})
			.WithName("GetLessonStructures")
			.Produces<IList<LessonStructureResult>>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden);
	}
}