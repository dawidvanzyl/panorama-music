using PanoramaMusic.Api.Extensions;
using PanoramaMusic.Api.Filters;
using PanoramaMusic.Students.Application.Commands.GuardianRelationships;
using PanoramaMusic.Students.Application.Handlers.GuardianRelationships;
using PanoramaMusic.Students.Application.Handlers.Guardians;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Application.Requests.GuardianRelationships;

namespace PanoramaMusic.Api.Routes.Students;

public static class GuardianRelationshipRoutes
{
	public static void MapGuardianRelationshipRoutes(this WebApplication app)
	{
		// Reading the lookup is open to every staff role: Teachers need it for the
		// relationship dropdown when adding a guardian, and Coordinators need it to
		// list the types they maintain. Maintaining it is Coordinator-or-Admin.
		app
			.MapGroup("/api/guardian-relationships")
			.WithTags("Guardian Relationships")
			.RequireAuthorization("TeacherCoordinatorOrAdminPolicy")
			.MapGet("/", async (GetGuardianRelationshipsHandler handler, CancellationToken ct) =>
			{
				var result = await handler.HandleAsync(ct);
				return Results.Ok(result);
			})
			.MarkSensitiveResponse()
			.WithName("GetGuardianRelationships")
			.Produces<IList<GuardianRelationshipResult>>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden);

		var maintenanceGroup = app
			.MapGroup("/api/guardian-relationships")
			.WithTags("Guardian Relationships")
			.RequireAuthorization("CoordinatorOrAdminPolicy");

		maintenanceGroup
			.MapPost("/", async (CreateGuardianRelationshipRequest request, CreateGuardianRelationshipHandler handler, CancellationToken ct) =>
			{
				var command = new CreateGuardianRelationshipCommand(request);
				var result = await handler.HandleAsync(command, ct);
				return Results.Created($"/api/guardian-relationships/{result.GuardianRelationshipId}", result);
			})
			.AddEndpointFilter<ValidationFilter<CreateGuardianRelationshipRequest>>()
			.WithName("CreateGuardianRelationship")
			.Produces<GuardianRelationshipResult>(StatusCodes.Status201Created)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden);

		maintenanceGroup
			.MapPut("/{guardianRelationshipId:guid}", async (Guid guardianRelationshipId, UpdateGuardianRelationshipRequest request, RenameGuardianRelationshipHandler handler, CancellationToken ct) =>
			{
				var command = new RenameGuardianRelationshipCommand(guardianRelationshipId, request);
				var result = await handler.HandleAsync(command, ct);
				return Results.Ok(result);
			})
			.AddEndpointFilter<ValidationFilter<UpdateGuardianRelationshipRequest>>()
			.WithName("RenameGuardianRelationship")
			.Produces<GuardianRelationshipResult>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);

		maintenanceGroup
			.MapGet("/{guardianRelationshipId:guid}/count", async (Guid guardianRelationshipId, CountGuardianRelationshipHandler handler, CancellationToken ct) =>
			{
				var result = await handler.HandleAsync(guardianRelationshipId, ct);
				return Results.Ok(result);
			})
			.WithName("CountGuardianRelationship")
			.Produces<CountGuardianRelationshipResult>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);

		maintenanceGroup
			.MapDelete("/{guardianRelationshipId:guid}", async (Guid guardianRelationshipId, DeleteGuardianRelationshipHandler handler, CancellationToken ct) =>
			{
				var command = new DeleteGuardianRelationshipCommand(guardianRelationshipId);
				await handler.HandleAsync(command, ct);
				return Results.Ok();
			})
			.WithName("DeleteGuardianRelationship")
			.Produces(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);
	}
}