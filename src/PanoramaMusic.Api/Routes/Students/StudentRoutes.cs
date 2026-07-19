using PanoramaMusic.Api.Filters;
using PanoramaMusic.Students.Application.Commands;
using PanoramaMusic.Students.Application.Handlers;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Application.Requests;

namespace PanoramaMusic.Api.Routes.Students;

public static class StudentRoutes
{
	public static void MapStudentRoutes(this WebApplication app)
	{
		var group = app
			.MapGroup("/api/students")
			.WithTags("Students")
			.RequireAuthorization("TeacherOrAdminPolicy");

		group
			.MapGet("/", async (GetStudentsHandler handler, CancellationToken ct) =>
			{
				var result = await handler.HandleAsync(ct);
				return Results.Ok(result);
			})
			.WithName("GetStudents")
			.Produces<IList<StudentResult>>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden);

		group
			.MapGet("/{studentId:guid}", async (Guid studentId, GetStudentByIdHandler handler, CancellationToken ct) =>
			{
				var result = await handler.HandleAsync(studentId, ct);
				return Results.Ok(result);
			})
			.WithName("GetStudentById")
			.Produces<StudentResult>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);

		group
			.MapPost("/", async (CreateStudentRequest request, CreateStudentHandler handler, CancellationToken ct) =>
			{
				var command = new CreateStudentCommand(request);
				var result = await handler.HandleAsync(command, ct);
				return Results.Created($"/api/students/{result.StudentId}", result);
			})
			.AddEndpointFilter<ValidationFilter<CreateStudentRequest>>()
			.WithName("CreateStudent")
			.Produces<StudentResult>(StatusCodes.Status201Created)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden);

		group
			.MapPatch("/{studentId:guid}", async (Guid studentId, UpdateStudentRequest request, UpdateStudentHandler handler, CancellationToken ct) =>
			{
				var command = new UpdateStudentCommand(studentId, request);
				var result = await handler.HandleAsync(command, ct);
				return Results.Ok(result);
			})
			.AddEndpointFilter<ValidationFilter<UpdateStudentRequest>>()
			.WithName("UpdateStudent")
			.Produces<StudentResult>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);

		group
			.MapDelete("/{studentId:guid}", async (Guid studentId, DeleteStudentHandler handler, CancellationToken ct) =>
			{
				var command = new DeleteStudentCommand(studentId);
				await handler.HandleAsync(command, ct);
				return Results.Ok();
			})
			.WithName("DeleteStudent")
			.Produces(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);
	}
}