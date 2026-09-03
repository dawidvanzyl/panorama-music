using PanoramaMusic.Api.Extensions;
using PanoramaMusic.Api.Filters;
using PanoramaMusic.Students.Application.Commands.Siblings;
using PanoramaMusic.Students.Application.Commands.Students;
using PanoramaMusic.Students.Application.Handlers.Siblings;
using PanoramaMusic.Students.Application.Handlers.Students;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Application.Requests.Siblings;
using PanoramaMusic.Students.Application.Requests.Students;

namespace PanoramaMusic.Api.Routes.Students;

public static class StudentRoutes
{
	public static void MapStudentRoutes(this WebApplication app)
	{
		// Reads are open to Teacher and Coordinator — a Coordinator capturing a
		// waiting-list student needs GetStudents for the wizard's Siblings-tab
		// candidate list (ruling R9, reversing R8's "do not widen"; a Coordinator
		// who cannot read students cannot link siblings during the one flow they
		// own). Most writes stay Teacher-gated below via an explicit override —
		// minimal-API route authorization is additive, so re-declaring
		// TeacherPolicy on each write is what actually narrows it back down.
		// AddSibling is the one exception (ruling R10): the capture wizard links
		// staged siblings to the student it just created, and a half-captured
		// student with a 403 on that step is a worse outcome than the write
		// being reachable a beat earlier than the rest.
		var group = app
			.MapGroup("/api/students")
			.WithTags("Students")
			.RequireAuthorization("TeacherOrCoordinatorPolicy");

		group
			.MapGet("/", async (GetStudentsHandler handler, CancellationToken ct) =>
			{
				var result = await handler.HandleAsync(ct);
				return Results.Ok(result);
			})
			.MarkSensitiveResponse()
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
			.MarkSensitiveResponse()
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
			.RequireAuthorization("TeacherPolicy")
			.MarkSensitiveResponse()
			.WithName("CreateStudent")
			.Produces<StudentResult>(StatusCodes.Status201Created)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden);

		group
			.MapPut("/{studentId:guid}", async (Guid studentId, UpdateStudentRequest request, UpdateStudentHandler handler, CancellationToken ct) =>
			{
				var command = new UpdateStudentCommand(studentId, request);
				var result = await handler.HandleAsync(command, ct);
				return Results.Ok(result);
			})
			.AddEndpointFilter<ValidationFilter<UpdateStudentRequest>>()
			.RequireAuthorization("TeacherPolicy")
			.MarkSensitiveResponse()
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
			.RequireAuthorization("TeacherPolicy")
			.WithName("DeleteStudent")
			.Produces(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);

		group
			.MapPost("/{studentId:guid}/siblings", async (Guid studentId, AddSiblingRequest request, AddSiblingHandler handler, CancellationToken ct) =>
			{
				var command = new AddSiblingCommand(studentId, request.SiblingId);
				var result = await handler.HandleAsync(command, ct);
				return Results.Created($"/api/students/{studentId}/siblings/{request.SiblingId}", result);
			})
			.AddEndpointFilter<ValidationFilter<AddSiblingRequest>>()
			// Coordinator-permitted (ruling R10): the waiting-list capture wizard
			// links staged siblings to the student it just created, so this write
			// stays under the group's own TeacherOrCoordinatorPolicy rather than
			// being re-tightened like the other four writes in this file.
			.MarkSensitiveResponse()
			.WithName("AddSibling")
			.Produces<StudentResult>(StatusCodes.Status201Created)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);

		group
			.MapGet("/{studentId:guid}/siblings", async (Guid studentId, GetSiblingsHandler handler, CancellationToken ct) =>
			{
				var result = await handler.HandleAsync(studentId, ct);
				return Results.Ok(result);
			})
			.MarkSensitiveResponse()
			.WithName("GetSiblings")
			.Produces<IList<StudentResult>>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);

		group
			.MapDelete("/{studentId:guid}/siblings/{siblingId:guid}", async (Guid studentId, Guid siblingId, RemoveSiblingHandler handler, CancellationToken ct) =>
			{
				var command = new RemoveSiblingCommand(studentId, siblingId);
				await handler.HandleAsync(command, ct);
				return Results.Ok();
			})
			.RequireAuthorization("TeacherPolicy")
			.WithName("RemoveSibling")
			.Produces(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);
	}
}