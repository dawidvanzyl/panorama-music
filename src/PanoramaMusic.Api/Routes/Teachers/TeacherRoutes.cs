using PanoramaMusic.Api.Extensions;
using PanoramaMusic.Api.Filters;
using PanoramaMusic.Teachers.Application.Commands.Teachers;
using PanoramaMusic.Teachers.Application.Handlers.Teachers;
using PanoramaMusic.Teachers.Application.Models;
using PanoramaMusic.Teachers.Application.Requests.Teachers;

namespace PanoramaMusic.Api.Routes.Teachers;

public static class TeacherRoutes
{
	public static void MapTeacherRoutes(this WebApplication app)
	{
		var group = app
			.MapGroup("/api/teachers")
			.WithTags("Teachers")
			.RequireAuthorization("CoordinatorOrAdminPolicy");

		// The lifecycle actions carry a narrower boundary than the rest of the
		// record: a Coordinator maintains a teacher's profile but does not end
		// one. Two independent groups rather than one branched twice, for the
		// same reason the banking routes use two — see TeacherBankingRoutes.
		var adminGroup = app
			.MapGroup("/api/teachers")
			.WithTags("Teachers")
			.RequireAuthorization("AdminPolicy");

		// Reading the roster is open to a Teacher too — assigning a teacher to a
		// student's enrollment on Student Management needs it, and seeing who
		// teaches is not the same as maintaining teachers. The rest of the record
		// keeps its narrower boundary, on the same reasoning already recorded for
		// the course catalogue read.
		var rosterGroup = app
			.MapGroup("/api/teachers")
			.WithTags("Teachers")
			.RequireAuthorization("TeacherCoordinatorOrAdminPolicy");

		rosterGroup
			.MapGet("/", async (GetTeachersHandler handler, CancellationToken ct) =>
			{
				var result = await handler.HandleAsync(ct);
				return Results.Ok(result);
			})
			.MarkSensitiveResponse()
			.WithName("GetTeachers")
			.Produces<IList<TeacherResult>>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden);

		group
			.MapGet("/linkable-accounts", async (GetLinkableAccountsHandler handler, CancellationToken ct) =>
			{
				var result = await handler.HandleAsync(ct);
				return Results.Ok(result);
			})
			.MarkSensitiveResponse()
			.WithName("GetLinkableAccounts")
			.Produces<IList<LinkableAccountResult>>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden);

		group
			.MapGet("/{teacherId:guid}", async (Guid teacherId, GetTeacherByIdHandler handler, CancellationToken ct) =>
			{
				var result = await handler.HandleAsync(teacherId, ct);
				return Results.Ok(result);
			})
			.MarkSensitiveResponse()
			.WithName("GetTeacherById")
			.Produces<TeacherResult>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);

		group
			.MapPost("/", async (CreateTeacherRequest request, CreateTeacherHandler handler, CancellationToken ct) =>
			{
				var command = new CreateTeacherCommand(request);
				var result = await handler.HandleAsync(command, ct);
				return Results.Created($"/api/teachers/{result.TeacherId}", result);
			})
			.AddEndpointFilter<ValidationFilter<CreateTeacherRequest>>()
			.MarkSensitiveResponse()
			.WithName("CreateTeacher")
			.Produces<TeacherResult>(StatusCodes.Status201Created)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden);

		group
			.MapPut("/{teacherId:guid}/profile", async (Guid teacherId, UpdateTeacherProfileRequest request, UpdateTeacherProfileHandler handler, CancellationToken ct) =>
			{
				var command = new UpdateTeacherProfileCommand(teacherId, request);
				var result = await handler.HandleAsync(command, ct);
				return Results.Ok(result);
			})
			.AddEndpointFilter<ValidationFilter<UpdateTeacherProfileRequest>>()
			.MarkSensitiveResponse()
			.WithName("UpdateTeacherProfile")
			.Produces<TeacherResult>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);

		// The classification is maintained on its own, outside the profile edit
		// flow, so it has its own endpoint rather than riding along with the names.
		group
			.MapPut("/{teacherId:guid}/classification", async (Guid teacherId, UpdateTeacherClassificationRequest request, UpdateTeacherClassificationHandler handler, CancellationToken ct) =>
			{
				var command = new UpdateTeacherClassificationCommand(teacherId, request);
				var result = await handler.HandleAsync(command, ct);
				return Results.Ok(result);
			})
			.MarkSensitiveResponse()
			.WithName("UpdateTeacherClassification")
			.Produces<TeacherResult>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);

		// A link is established or removed, never changed in place, so linking
		// and unlinking are separate operations rather than one nullable write.
		group
			.MapPut("/{teacherId:guid}/account", async (Guid teacherId, LinkTeacherAccountRequest request, LinkTeacherAccountHandler handler, CancellationToken ct) =>
			{
				var command = new LinkTeacherAccountCommand(teacherId, request.AccountId);
				var result = await handler.HandleAsync(command, ct);
				return Results.Ok(result);
			})
			.AddEndpointFilter<ValidationFilter<LinkTeacherAccountRequest>>()
			.MarkSensitiveResponse()
			.WithName("LinkTeacherAccount")
			.Produces<TeacherResult>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);

		group
			.MapDelete("/{teacherId:guid}/account", async (Guid teacherId, UnlinkTeacherAccountHandler handler, CancellationToken ct) =>
			{
				var command = new UnlinkTeacherAccountCommand(teacherId);
				var result = await handler.HandleAsync(command, ct);
				return Results.Ok(result);
			})
			.MarkSensitiveResponse()
			.WithName("UnlinkTeacherAccount")
			.Produces<TeacherResult>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);

		// Deactivation and reactivation move the record between two states rather
		// than replacing it, so each is its own action on the resource. DELETE is
		// reserved for the permanent removal below — the two steps of the
		// lifecycle stay distinguishable at the URL.
		adminGroup
			.MapPatch("/{teacherId:guid}/deactivate", async (Guid teacherId, DeactivateTeacherHandler handler, CancellationToken ct) =>
			{
				var command = new DeactivateTeacherCommand(teacherId);
				var result = await handler.HandleAsync(command, ct);
				return Results.Ok(result);
			})
			.MarkSensitiveResponse()
			.WithName("DeactivateTeacher")
			.Produces<TeacherResult>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);

		adminGroup
			.MapPatch("/{teacherId:guid}/reactivate", async (Guid teacherId, ReactivateTeacherHandler handler, CancellationToken ct) =>
			{
				var command = new ReactivateTeacherCommand(teacherId);
				var result = await handler.HandleAsync(command, ct);
				return Results.Ok(result);
			})
			.MarkSensitiveResponse()
			.WithName("ReactivateTeacher")
			.Produces<TeacherResult>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);

		// Refused outright while the teacher is active. The interface does not
		// offer the action until then, but that is presentation — this endpoint
		// is where the rule is actually enforced.
		adminGroup
			.MapDelete("/{teacherId:guid}", async (Guid teacherId, DeleteTeacherHandler handler, CancellationToken ct) =>
			{
				var command = new DeleteTeacherCommand(teacherId);
				await handler.HandleAsync(command, ct);
				return Results.NoContent();
			})
			.WithName("DeleteTeacher")
			.Produces(StatusCodes.Status204NoContent)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);
	}
}