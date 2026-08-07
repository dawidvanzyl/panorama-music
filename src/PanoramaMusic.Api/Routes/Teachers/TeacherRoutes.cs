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

		group
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
	}
}