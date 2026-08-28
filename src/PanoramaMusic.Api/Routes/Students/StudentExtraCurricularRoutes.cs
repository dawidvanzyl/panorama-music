using PanoramaMusic.Api.Extensions;
using PanoramaMusic.Api.Filters;
using PanoramaMusic.Students.Application.Commands.StudentExtraCurriculars;
using PanoramaMusic.Students.Application.Handlers.StudentExtraCurriculars;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Application.Requests.StudentExtraCurriculars;
using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Api.Routes.Students;

public static class StudentExtraCurricularRoutes
{
	public static void MapStudentExtraCurricularRoutes(this WebApplication app)
	{
		// A student's participation is maintained from Student Management, so it
		// carries that screen's boundary — the same one StudentCourseRoutes uses —
		// rather than the narrower Teacher-view/Coordinator-maintain model that
		// guards the Extra-Curriculars Management page. Realigning the Student
		// area's roles is #273's decision, not this story's; reading the
		// assignable activities is therefore a student-scoped endpoint rather than
		// a call to the catalogue endpoint, so no caller is left with a tab it
		// cannot populate.
		var group = app
			.MapGroup("/api/students")
			.WithTags("StudentExtraCurriculars")
			.RequireAuthorization("TeacherPolicy");

		group
			.MapGet("/{studentId:guid}/extra-curriculars", async (Guid studentId, GetStudentExtraCurricularsHandler handler, CancellationToken ct) =>
			{
				var result = await handler.HandleAsync(studentId, ct);
				return Results.Ok(result);
			})
			.MarkSensitiveResponse()
			.WithName("GetStudentExtraCurriculars")
			.Produces<IList<ExtraCurricularResult>>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);

		// Both narrowings the picker needs — the student's own phase, and what they
		// do not already take part in — are the query's, so this answers with the
		// list the panel offers rather than something the screen has to filter.
		group
			.MapGet("/{studentId:guid}/extra-curriculars/assignable", async (Guid studentId, GetAssignableExtraCurricularsHandler handler, CancellationToken ct) =>
			{
				var result = await handler.HandleAsync(studentId, ct);
				return Results.Ok(result);
			})
			.MarkSensitiveResponse()
			.WithName("GetAssignableExtraCurriculars")
			.Produces<IList<ExtraCurricularResult>>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);

		// The same picker, for a student who does not exist yet: the create wizard
		// stages its assignments before the student is saved, so it has no
		// identifier to ask the route above with. It cannot fall back to the
		// catalogue endpoint either — that one is closed to Admin, who is one of
		// the callers this area admits, and widening it is #273's decision. Phase
		// alone is the whole narrowing; a student who does not exist takes part in
		// nothing, and what the wizard has staged is its own to leave out.
		group
			.MapGet("/extra-curriculars/assignable", async (PhaseType phase, GetAssignableExtraCurricularsByPhaseHandler handler, CancellationToken ct) =>
			{
				var result = await handler.HandleAsync(phase, ct);
				return Results.Ok(result);
			})
			.WithName("GetAssignableExtraCurricularsByPhase")
			.Produces<IList<ExtraCurricularResult>>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden);

		group
			.MapPost("/{studentId:guid}/extra-curriculars", async (Guid studentId, AssignExtraCurricularRequest request, AssignExtraCurricularHandler handler, CancellationToken ct) =>
			{
				var command = new AssignExtraCurricularCommand(studentId, request);
				var result = await handler.HandleAsync(command, ct);
				return Results.Created($"/api/students/{studentId}/extra-curriculars/{result.ExtraCurricularId}", result);
			})
			.AddEndpointFilter<ValidationFilter<AssignExtraCurricularRequest>>()
			.MarkSensitiveResponse()
			.WithName("AssignStudentExtraCurricular")
			.Produces<ExtraCurricularResult>(StatusCodes.Status201Created)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);

		// The activity is how an assignment is addressed: the link carries nothing
		// of its own, so it has no identifier of its own either. Answers 204 rather
		// than the Enrollment group's 200 — there is no body, and the frozen E2E
		// scenario design for this story asserts 204.
		group
			.MapDelete("/{studentId:guid}/extra-curriculars/{extraCurricularId:guid}", async (Guid studentId, Guid extraCurricularId, RemoveExtraCurricularHandler handler, CancellationToken ct) =>
			{
				var command = new RemoveExtraCurricularCommand(studentId, extraCurricularId);
				await handler.HandleAsync(command, ct);
				return Results.NoContent();
			})
			.WithName("RemoveStudentExtraCurricular")
			.Produces(StatusCodes.Status204NoContent)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);
	}
}