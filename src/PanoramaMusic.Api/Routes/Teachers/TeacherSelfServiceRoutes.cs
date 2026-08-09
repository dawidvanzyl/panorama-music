using PanoramaMusic.Api.Extensions;
using PanoramaMusic.Api.Filters;
using PanoramaMusic.Teachers.Application.Handlers.Self;
using PanoramaMusic.Teachers.Application.Models;
using PanoramaMusic.Teachers.Application.Requests.Banking;
using PanoramaMusic.Teachers.Application.Requests.Teachers;

namespace PanoramaMusic.Api.Routes.Teachers;

/// <summary>
/// What a teacher may do to their own record. These endpoints take no teacher
/// id: the record is resolved from the signed-in account, so there is nothing in
/// the request that could be pointed at somebody else's. That, rather than a
/// role, is the boundary — which is why the group requires only authentication.
/// A caller whose account is linked to no teacher is refused here as surely as
/// one asking for another teacher's record, because there is no record to
/// resolve for them.
/// <para>
/// Holding this access makes nobody an Admin or a Coordinator. The roster, any
/// other teacher's record, the employment classification and the account link
/// stay behind the role-gated groups next door — a teacher reaching for any of
/// them is refused there, unchanged by anything in this file.
/// </para>
/// </summary>
public static class TeacherSelfServiceRoutes
{
	public static void MapTeacherSelfServiceRoutes(this WebApplication app)
	{
		var group = app
			.MapGroup("/api/teachers/me")
			.WithTags("Teacher Self-Service")
			.RequireAuthorization();

		group
			.MapGet("/", async (GetOwnTeacherHandler handler, CancellationToken ct) =>
			{
				var result = await handler.HandleAsync(ct);
				return Results.Ok(result);
			})
			.MarkSensitiveResponse()
			.WithName("GetOwnTeacher")
			.Produces<TeacherResult>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status404NotFound);

		// Names only. There is deliberately no self-service counterpart to the
		// classification or account endpoints — a teacher reaching for those goes
		// to the role-gated ones and is refused.
		group
			.MapPut("/profile", async (UpdateTeacherProfileRequest request, UpdateOwnTeacherProfileHandler handler, CancellationToken ct) =>
			{
				var result = await handler.HandleAsync(request, ct);
				return Results.Ok(result);
			})
			.AddEndpointFilter<ValidationFilter<UpdateTeacherProfileRequest>>()
			.MarkSensitiveResponse()
			.WithName("UpdateOwnTeacherProfile")
			.Produces<TeacherResult>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status404NotFound);

		group
			.MapGet("/banking/activity", async (GetOwnBankingActivityHandler handler, CancellationToken ct) =>
			{
				var result = await handler.HandleAsync(ct);
				return Results.Ok(result);
			})
			.MarkSensitiveResponse()
			.WithName("GetOwnBankingActivity")
			.Produces<IList<BankingActivityEntryResult>>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status404NotFound);

		group
			.MapPost("/banking", async (CreateBankingDetailsRequest request, CreateOwnBankingDetailsHandler handler, CancellationToken ct) =>
			{
				var result = await handler.HandleAsync(request, ct);
				return Results.Created("/api/teachers/me/banking", result);
			})
			.AddEndpointFilter<ValidationFilter<CreateBankingDetailsRequest>>()
			.MarkSensitiveResponse()
			.WithName("CreateOwnBankingDetails")
			.Produces<BankingDetailsResult>(StatusCodes.Status201Created)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status404NotFound);

		group
			.MapPut("/banking", async (UpdateBankingDetailsRequest request, UpdateOwnBankingDetailsHandler handler, CancellationToken ct) =>
			{
				var result = await handler.HandleAsync(request, ct);
				return Results.Ok(result);
			})
			.AddEndpointFilter<ValidationFilter<UpdateBankingDetailsRequest>>()
			.MarkSensitiveResponse()
			.WithName("UpdateOwnBankingDetails")
			.Produces<BankingDetailsResult>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status404NotFound);

		group
			.MapDelete("/banking", async (DeleteOwnBankingDetailsHandler handler, CancellationToken ct) =>
			{
				await handler.HandleAsync(ct);
				return Results.NoContent();
			})
			.WithName("DeleteOwnBankingDetails")
			.Produces(StatusCodes.Status204NoContent)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status404NotFound);

		// A POST for the same reason the Admin reveal is one: revealing has a
		// recorded side-effect, and a GET would invite caching and land the full
		// number in a URL-shaped access log.
		group
			.MapPost("/banking/reveal", async (RevealOwnAccountNumberHandler handler, CancellationToken ct) =>
			{
				var result = await handler.HandleAsync(ct);
				return Results.Ok(result);
			})
			.MarkSensitiveResponse()
			.WithName("RevealOwnAccountNumber")
			.Produces<RevealedAccountNumberResult>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status404NotFound);
	}
}