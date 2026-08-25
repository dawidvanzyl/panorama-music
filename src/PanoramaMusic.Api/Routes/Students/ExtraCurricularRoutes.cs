using PanoramaMusic.Api.Filters;
using PanoramaMusic.Students.Application.Commands.ExtraCurriculars;
using PanoramaMusic.Students.Application.Handlers.ExtraCurriculars;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Application.Requests.ExtraCurriculars;
using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Api.Routes.Students;

public static class ExtraCurricularRoutes
{
	public static void MapExtraCurricularRoutes(this WebApplication app)
	{
		// Extra-curriculars are a Coordinator-owned area: a Teacher may read the
		// catalogue, a Coordinator maintains it, and the Admin role carries no
		// rights here at all — neither policy below admits it. Do not copy the
		// Courses area's roles; they are deliberately wider.
		app
			.MapGroup("/api/extra-curriculars")
			.WithTags("ExtraCurriculars")
			.RequireAuthorization("TeacherOrCoordinatorPolicy")
			// The optional phase narrows the read itself. Omitted, the whole
			// catalogue comes back and the screen narrows what it already holds,
			// as it does for courses.
			.MapGet("/", async (PhaseType? phase, GetExtraCurricularsHandler handler, CancellationToken ct) =>
			{
				var result = await handler.HandleAsync(phase, ct);
				return Results.Ok(result);
			})
			.WithName("GetExtraCurriculars")
			.Produces<IList<ExtraCurricularResult>>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden);

		// An activity owns its practice times, so it is defined with the whole of
		// them in one request — there is no moment at which one exists without
		// the other. Maintaining the slots of an activity that already exists is
		// a separate surface.
		var maintenanceGroup = app
			.MapGroup("/api/extra-curriculars")
			.WithTags("ExtraCurriculars")
			.RequireAuthorization("CoordinatorPolicy");

		maintenanceGroup
			.MapPost("/", async (CreateExtraCurricularRequest request, CreateExtraCurricularHandler handler, CancellationToken ct) =>
			{
				var command = new CreateExtraCurricularCommand(request);
				var result = await handler.HandleAsync(command, ct);
				return Results.Created($"/api/extra-curriculars/{result.ExtraCurricularId}", result);
			})
			.AddEndpointFilter<ValidationFilter<CreateExtraCurricularRequest>>()
			.WithName("CreateExtraCurricular")
			.Produces<ExtraCurricularResult>(StatusCodes.Status201Created)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden);

		// Maintaining the slots of an activity that already exists: each slot is
		// added and removed on its own, and there is no edit — a slot is changed
		// by removing it and adding the one that replaces it.
		maintenanceGroup
			.MapPost("/{extraCurricularId:guid}/practice-times", async (Guid extraCurricularId, PracticeTimeRequest request, AddPracticeTimeHandler handler, CancellationToken ct) =>
			{
				var command = new AddPracticeTimeCommand(extraCurricularId, request);
				var result = await handler.HandleAsync(command, ct);
				return Results.Created($"/api/extra-curriculars/{extraCurricularId}/practice-times/{result.PracticeTimeId}", result);
			})
			.AddEndpointFilter<ValidationFilter<PracticeTimeRequest>>()
			.WithName("AddExtraCurricularPracticeTime")
			.Produces<PracticeTimeResult>(StatusCodes.Status201Created)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);

		maintenanceGroup
			.MapDelete("/{extraCurricularId:guid}/practice-times/{practiceTimeId:guid}", async (Guid extraCurricularId, Guid practiceTimeId, RemovePracticeTimeHandler handler, CancellationToken ct) =>
			{
				var command = new RemovePracticeTimeCommand(extraCurricularId, practiceTimeId);
				await handler.HandleAsync(command, ct);
				return Results.Ok();
			})
			.WithName("RemoveExtraCurricularPracticeTime")
			.Produces(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);
	}
}