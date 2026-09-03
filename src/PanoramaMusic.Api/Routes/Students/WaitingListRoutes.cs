using PanoramaMusic.Api.Extensions;
using PanoramaMusic.Api.Filters;
using PanoramaMusic.Students.Application.Commands.WaitingList;
using PanoramaMusic.Students.Application.Handlers.WaitingList;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Application.Requests.Students;
using PanoramaMusic.Students.Application.Requests.WaitingList;

namespace PanoramaMusic.Api.Routes.Students;

public static class WaitingListRoutes
{
	public static void MapWaitingListRoutes(this WebApplication app)
	{
		// Read-only for this group: a Teacher and a Coordinator may both read the
		// list. Every write below sits under CoordinatorPolicy instead — do not
		// widen this one to admit them.
		app
			.MapGroup("/api/waiting-list")
			.WithTags("WaitingList")
			.RequireAuthorization("TeacherOrCoordinatorPolicy")
			.MapGet("/", async (GetWaitingListHandler handler, CancellationToken ct) =>
			{
				var result = await handler.HandleAsync(ct);
				return Results.Ok(result);
			})
			.WithName("GetWaitingList")
			// Each row names a student and may carry their notes — sensitive on the
			// same terms as GetStudents.
			.MarkSensitiveResponse()
			.Produces<IList<WaitingListGroupResult>>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden);

		// Maintaining the list — capturing onto it, correcting a row, removing one
		// — is Coordinator-only. A Teacher gets no affordance for any of it and is
		// refused by these endpoints too.
		var maintain = app
			.MapGroup("/api/waiting-list")
			.WithTags("WaitingList")
			.RequireAuthorization("CoordinatorPolicy");

		maintain
			.MapPost("/", async (CaptureWaitingListStudentRequest request, CaptureWaitingListStudentHandler handler, CancellationToken ct) =>
			{
				var command = new CaptureWaitingListStudentCommand(request);
				var result = await handler.HandleAsync(command, ct);
				return Results.Created($"/api/waiting-list/{result.WaitingListEntryId}", result);
			})
			.AddEndpointFilter<ValidationFilter<CaptureWaitingListStudentRequest>>()
			.MarkSensitiveResponse()
			.WithName("CaptureWaitingListStudent")
			.Produces<WaitingListEntryResult>(StatusCodes.Status201Created)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden);

		maintain
			.MapPut("/{waitingListEntryId:guid}", async (
				Guid waitingListEntryId,
				UpdateWaitingListEntryRequest request,
				UpdateWaitingListEntryHandler handler,
				CancellationToken ct) =>
			{
				var command = new UpdateWaitingListEntryCommand(waitingListEntryId, request);
				var result = await handler.HandleAsync(command, ct);
				return Results.Ok(result);
			})
			.AddEndpointFilter<ValidationFilter<UpdateWaitingListEntryRequest>>()
			.MarkSensitiveResponse()
			.WithName("UpdateWaitingListEntry")
			.Produces<WaitingListEntryResult>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);

		// A waiting-list student's own details. Separate from the roster's
		// PUT /api/students/{id}, which is a Teacher's: the two write the same
		// record but are reached by different roles from different screens, and
		// this one only resolves a student who actually holds an entry.
		maintain
			.MapPut("/students/{studentId:guid}", async (
				Guid studentId,
				UpdateStudentRequest request,
				UpdateWaitingListStudentHandler handler,
				CancellationToken ct) =>
			{
				var command = new UpdateWaitingListStudentCommand(studentId, request);
				var result = await handler.HandleAsync(command, ct);
				return Results.Ok(result);
			})
			.AddEndpointFilter<ValidationFilter<UpdateStudentRequest>>()
			.MarkSensitiveResponse()
			.WithName("UpdateWaitingListStudent")
			.Produces<StudentResult>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);

		maintain
			.MapDelete("/students/{studentId:guid}", async (
				Guid studentId,
				RemoveWaitingListStudentHandler handler,
				CancellationToken ct) =>
			{
				var command = new RemoveWaitingListStudentCommand(studentId);
				await handler.HandleAsync(command, ct);
				return Results.Ok();
			})
			.WithName("RemoveWaitingListStudent")
			.Produces(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);
	}
}