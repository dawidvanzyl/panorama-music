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
			.Produces<IList<AdminUserSummary>>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status403Forbidden);

		group
			.MapPost("/", async (CreateUserRequest request, CreateUserHandler handler, CancellationToken ct) =>
			{
				var command = new CreateUserCommand(request);
				var result = await handler.HandleAsync(command, ct);
				return Results.Created($"/api/users/{result.UserId}", result);
			})
			.WithName("CreateUser")
			.Produces<CreateUserResult>(StatusCodes.Status201Created)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status403Forbidden);

		group
			.MapPost("/{userId:guid}/invite", async (Guid userId, RegenerateInviteTokenHandler handler, CancellationToken ct) =>
			{
				var command = new RegenerateInviteTokenCommand(userId);
				var result = await handler.HandleAsync(command, ct);
				return Results.Ok(result);
			})
			.WithName("RegenerateInviteToken")
			.Produces<RegenerateInviteTokenResult>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status403Forbidden);
	}
}