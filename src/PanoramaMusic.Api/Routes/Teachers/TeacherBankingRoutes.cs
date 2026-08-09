using PanoramaMusic.Api.Extensions;
using PanoramaMusic.Api.Filters;
using PanoramaMusic.Teachers.Application.Commands.Banking;
using PanoramaMusic.Teachers.Application.Handlers.Banking;
using PanoramaMusic.Teachers.Application.Models;
using PanoramaMusic.Teachers.Application.Requests.Banking;

namespace PanoramaMusic.Api.Routes.Teachers;

/// <summary>
/// Banking details live on their own route group because they carry their own
/// authorization boundary, not the teacher routes' one: a Coordinator may read
/// a teacher's masked details and their banking activity, but only an Admin may
/// capture, edit, delete or reveal them.
/// <para>
/// The masked details themselves are not served here — they ride on the teacher
/// record under the group next door, so opening a record costs one request. The
/// endpoints below are the ones that either change something or hand back the
/// full number.
/// </para>
/// <para>
/// Every role check is on the endpoint. Hiding a control in the interface is
/// presentation and is not an authorization boundary. Self-service is not served
/// by widening the policy on this group: a teacher acting on their own record
/// goes through the parallel /api/teachers/me group, which takes no teacher id
/// at all and resolves the record from the signed-in account, so no caller can
/// name a record that is not theirs.
/// </para>
/// </summary>
public static class TeacherBankingRoutes
{
	public static void MapTeacherBankingRoutes(this WebApplication app)
	{
		// Two independent groups rather than one group branched twice:
		// RequireAuthorization adds a convention to the group it is called on
		// rather than returning a separate branch, so calling it twice on a
		// shared group would require both policies on every endpoint below.
		var adminGroup = app
			.MapGroup("/api/teachers/{teacherId:guid}/banking")
			.WithTags("Teacher Banking")
			.RequireAuthorization("AdminPolicy");

		var readGroup = app
			.MapGroup("/api/teachers/{teacherId:guid}/banking")
			.WithTags("Teacher Banking")
			.RequireAuthorization("CoordinatorOrAdminPolicy");

		readGroup
			.MapGet("/activity", async (Guid teacherId, GetBankingActivityHandler handler, CancellationToken ct) =>
			{
				var result = await handler.HandleAsync(teacherId, ct);
				return Results.Ok(result);
			})
			.MarkSensitiveResponse()
			.WithName("GetTeacherBankingActivity")
			.Produces<IList<BankingActivityEntryResult>>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);

		adminGroup
			.MapPost("/", async (Guid teacherId, CreateBankingDetailsRequest request, CreateBankingDetailsHandler handler, CancellationToken ct) =>
			{
				var command = new CreateBankingDetailsCommand(teacherId, request);
				var result = await handler.HandleAsync(command, ct);
				return Results.Created($"/api/teachers/{teacherId}/banking", result);
			})
			.AddEndpointFilter<ValidationFilter<CreateBankingDetailsRequest>>()
			.MarkSensitiveResponse()
			.WithName("CreateTeacherBankingDetails")
			.Produces<BankingDetailsResult>(StatusCodes.Status201Created)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);

		adminGroup
			.MapPut("/", async (Guid teacherId, UpdateBankingDetailsRequest request, UpdateBankingDetailsHandler handler, CancellationToken ct) =>
			{
				var command = new UpdateBankingDetailsCommand(teacherId, request);
				var result = await handler.HandleAsync(command, ct);
				return Results.Ok(result);
			})
			.AddEndpointFilter<ValidationFilter<UpdateBankingDetailsRequest>>()
			.MarkSensitiveResponse()
			.WithName("UpdateTeacherBankingDetails")
			.Produces<BankingDetailsResult>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);

		adminGroup
			.MapDelete("/", async (Guid teacherId, DeleteBankingDetailsHandler handler, CancellationToken ct) =>
			{
				var command = new DeleteBankingDetailsCommand(teacherId);
				await handler.HandleAsync(command, ct);
				return Results.NoContent();
			})
			.WithName("DeleteTeacherBankingDetails")
			.Produces(StatusCodes.Status204NoContent)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);

		// A POST rather than a GET: revealing is an action with a recorded
		// side-effect, and a GET would invite caching and land the full number
		// in a URL-shaped access log.
		adminGroup
			.MapPost("/reveal", async (Guid teacherId, RevealAccountNumberHandler handler, CancellationToken ct) =>
			{
				var command = new RevealAccountNumberCommand(teacherId);
				var result = await handler.HandleAsync(command, ct);
				return Results.Ok(result);
			})
			.MarkSensitiveResponse()
			.WithName("RevealTeacherAccountNumber")
			.Produces<RevealedAccountNumberResult>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);
	}
}