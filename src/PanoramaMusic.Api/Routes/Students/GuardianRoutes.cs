using PanoramaMusic.Api.Extensions;
using PanoramaMusic.Api.Filters;
using PanoramaMusic.Students.Application.Commands.Guardians;
using PanoramaMusic.Students.Application.Handlers.Guardians;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Application.Requests.Guardians;

namespace PanoramaMusic.Api.Routes.Students;

public static class GuardianRoutes
{
	public static void MapGuardianRoutes(this WebApplication app)
	{
		// The waiting-list capture wizard previews and links
		// guardians for the student it just created, so AddGuardian and
		// GetGuardians stay under this group's own TeacherOrCoordinatorPolicy.
		// UnlinkGuardian, SyncGuardians and GetMissingSiblingGuardians are not
		// reachable from that flow at all — the wizard's Guardians step only
		// ever runs in create mode during capture, and its sync affordance and
		// missing-sibling-guardians check are edit-mode-only (see
		// pm-guardians-step.ts's own `_mode !== 'edit'` gate on the Sync
		// button, and pm-students-page.ts as the sole caller of both reads) —
		// so those three stay re-tightened to Teacher, the same reasoning
		// StudentRoutes.cs applies to the writes the capture wizard does not
		// call.
		var studentGroup = app
			.MapGroup("/api/students")
			.WithTags("Guardians")
			.RequireAuthorization("TeacherOrCoordinatorPolicy");

		studentGroup
			.MapPost("/{studentId:guid}/guardians", async (Guid studentId, AddGuardianRequest request, AddGuardianHandler handler, CancellationToken ct) =>
			{
				var command = new AddGuardianCommand(studentId, request);
				var result = await handler.HandleAsync(command, ct);
				return Results.Created($"/api/students/{studentId}/guardians/{result.GuardianId}", result);
			})
			.AddEndpointFilter<ValidationFilter<AddGuardianRequest>>()
			.MarkSensitiveResponse()
			.WithName("AddGuardian")
			.Produces<GuardianResult>(StatusCodes.Status201Created)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);

		studentGroup
			.MapGet("/{studentId:guid}/guardians", async (Guid studentId, GetGuardiansHandler handler, CancellationToken ct) =>
			{
				var result = await handler.HandleAsync(studentId, ct);
				return Results.Ok(result);
			})
			.MarkSensitiveResponse()
			.WithName("GetGuardians")
			.Produces<IList<GuardianResult>>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);

		studentGroup
			.MapDelete("/{studentId:guid}/guardians/{guardianId:guid}", async (Guid studentId, Guid guardianId, UnlinkGuardianHandler handler, CancellationToken ct) =>
			{
				var command = new UnlinkGuardianCommand(studentId, guardianId);
				await handler.HandleAsync(command, ct);
				return Results.Ok();
			})
			.RequireAuthorization("TeacherPolicy")
			.WithName("UnlinkGuardian")
			.Produces(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);

		studentGroup
			.MapPost("/{studentId:guid}/guardians/sync", async (Guid studentId, SyncGuardiansHandler handler, CancellationToken ct) =>
			{
				var result = await handler.HandleAsync(studentId, ct);
				return Results.Ok(result);
			})
			.RequireAuthorization("TeacherPolicy")
			.MarkSensitiveResponse()
			.WithName("SyncGuardians")
			.Produces<IList<GuardianResult>>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);

		studentGroup
			.MapGet("/{studentId:guid}/guardians/missing", async (Guid studentId, GetMissingSiblingGuardiansHandler handler, CancellationToken ct) =>
			{
				var result = await handler.HandleAsync(studentId, ct);
				return Results.Ok(result);
			})
			.RequireAuthorization("TeacherPolicy")
			.MarkSensitiveResponse()
			.WithName("GetMissingSiblingGuardians")
			.Produces<IList<GuardianResult>>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);

		var guardianGroup = app
			.MapGroup("/api/guardians")
			.WithTags("Guardians")
			.RequireAuthorization("TeacherPolicy");

		guardianGroup
			.MapPut("/{guardianId:guid}", async (Guid guardianId, UpdateGuardianRequest request, UpdateGuardianHandler handler, CancellationToken ct) =>
			{
				var command = new UpdateGuardianCommand(guardianId, request);
				var result = await handler.HandleAsync(command, ct);
				return Results.Ok(result);
			})
			.AddEndpointFilter<ValidationFilter<UpdateGuardianRequest>>()
			.MarkSensitiveResponse()
			.WithName("UpdateGuardian")
			.Produces<GuardianResult>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);

		guardianGroup
			.MapDelete("/{guardianId:guid}", async (Guid guardianId, DeleteGuardianHandler handler, CancellationToken ct) =>
			{
				var command = new DeleteGuardianCommand(guardianId);
				await handler.HandleAsync(command, ct);
				return Results.Ok();
			})
			.WithName("DeleteGuardian")
			.Produces(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);

		guardianGroup
			.MapGet("/{guardianId:guid}/shared", async (Guid guardianId, IsGuardianSharedHandler handler, CancellationToken ct) =>
			{
				var result = await handler.HandleAsync(guardianId, ct);
				return Results.Ok(result);
			})
			.WithName("IsGuardianShared")
			.Produces<bool>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);
	}
}