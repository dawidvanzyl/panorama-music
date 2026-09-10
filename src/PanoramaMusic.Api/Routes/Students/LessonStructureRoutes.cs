using PanoramaMusic.Students.Application.Handlers.LessonStructures;
using PanoramaMusic.Students.Application.Models;

namespace PanoramaMusic.Api.Routes.Students;

public static class LessonStructureRoutes
{
	public static void MapLessonStructureRoutes(this WebApplication app)
	{
		// The seeded set is authoritative and is never maintained at runtime, so
		// the lookup is read-only. Teacher and Coordinator both need it to pick a
		// structure when creating a course.
		var group = app
			.MapGroup("/api/lesson-structures")
			.WithTags("Lesson Structures")
			.RequireAuthorization("TeacherOrCoordinatorPolicy");

		group
			.MapGet("/", async (GetLessonStructuresHandler handler, CancellationToken ct) =>
			{
				var result = await handler.HandleAsync(ct);
				return Results.Ok(result);
			})
			.WithName("GetLessonStructures")
			.Produces<IList<LessonStructureResult>>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden);

		// The narrower set: the structures the school runs an instrument course
		// under. Course creation reads the route above, because creating a course
		// is how a structure comes to be offered at all; the waiting list reads
		// this one, because a student may only wait for something enrollable.
		group
			.MapGet("/offered", async (GetOfferedLessonStructuresHandler handler, CancellationToken ct) =>
			{
				var result = await handler.HandleAsync(ct);
				return Results.Ok(result);
			})
			.WithName("GetOfferedLessonStructures")
			.Produces<IList<LessonStructureResult>>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden);
	}
}