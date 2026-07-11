using PanoramaMusic.Api.Extensions;
using PanoramaMusic.Api.Filters;
using PanoramaMusic.Identity.Application.Commands.Admin;
using PanoramaMusic.Identity.Application.Handlers.Admin;
using PanoramaMusic.Identity.Application.Models;
using PanoramaMusic.Identity.Application.Requests.Admin;

namespace PanoramaMusic.Api.Routes.Identity;

public static class AdminRoutes
{
	public static void MapAdminRoutes(this WebApplication app)
	{
		var group = app
			.MapGroup("/api/users")
			.WithTags("Admin")
			.RequireAuthorization("AdminPolicy");

		group
			.MapGet("/", async (GetUsersHandler handler, CancellationToken ct) =>
			{
				var result = await handler.HandleAsync(ct);
				return Results.Ok(result);
			})
			.WithName("GetUsers")
			.Produces<IList<GetUserResult>>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden);

		group
			.MapPost("/", async (CreateUserRequest request, CreateUserHandler handler, CancellationToken ct) =>
			{
				var command = new CreateUserCommand(request);
				var result = await handler.HandleAsync(command, ct);
				return Results.Created($"/api/users/{result.UserId}", result);
			})
			.AddEndpointFilter<ValidationFilter<CreateUserRequest>>()
			.MarkSensitiveResponse()
			.WithName("CreateUser")
			.Produces<CreateUserResult>(StatusCodes.Status201Created)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden);

		group
			.MapPost("/{userId:guid}/invite", async (Guid userId, RegenerateInviteTokenHandler handler, CancellationToken ct) =>
			{
				var command = new RegenerateInviteTokenCommand(userId);
				var result = await handler.HandleAsync(command, ct);
				return Results.Ok(result);
			})
			.MarkSensitiveResponse()
			.WithName("RegenerateInviteToken")
			.Produces<RegenerateInviteTokenResult>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden);

		group
			.MapPatch("/{userId:guid}", async (Guid userId, UpdateUserRolesRequest request, UpdateUserRolesHandler handler, CancellationToken ct) =>
			{
				var command = new UpdateUserRolesCommand(userId, request);
				var result = await handler.HandleAsync(command, ct);
				return Results.Ok(result);
			})
			.AddEndpointFilter<ValidationFilter<UpdateUserRolesRequest>>()
			.WithName("UpdateUserRoles")
			.Produces<UpdateUserRolesResult>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);

		group
			.MapDelete("/{userId:guid}", async (Guid userId, DeactivateUserHandler handler, CancellationToken ct) =>
			{
				var command = new DeactivateUserCommand(userId);
				await handler.HandleAsync(command, ct);
				return Results.Ok();
			})
			.WithName("DeactivateUser")
			.Produces(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);

		group
			.MapDelete("/{userId:guid}/permanent", async (Guid userId, DeleteUserHandler handler, CancellationToken ct) =>
			{
				var command = new DeleteUserCommand(userId);
				await handler.HandleAsync(command, ct);
				return Results.Ok();
			})
			.WithName("DeleteUser")
			.Produces(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);

		group
			.MapPatch("/{userId:guid}/activate", async (Guid userId, ActivateUserHandler handler, CancellationToken ct) =>
			{
				var command = new ActivateUserCommand(userId);
				await handler.HandleAsync(command, ct);
				return Results.Ok();
			})
			.WithName("ActivateUser")
			.Produces(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);
	}
}