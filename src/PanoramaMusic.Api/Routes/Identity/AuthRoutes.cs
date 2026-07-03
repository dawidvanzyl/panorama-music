using PanoramaMusic.Api.Extensions;
using PanoramaMusic.Api.Filters;
using PanoramaMusic.Identity.Application.Commands.Admin;
using PanoramaMusic.Identity.Application.Commands.Auth;
using PanoramaMusic.Identity.Application.Commands.Sessions;
using PanoramaMusic.Identity.Application.Handlers.Admin;
using PanoramaMusic.Identity.Application.Handlers.Auth;
using PanoramaMusic.Identity.Application.Handlers.Sessions;
using PanoramaMusic.Identity.Application.Models;
using PanoramaMusic.Identity.Application.Requests.Auth;

namespace PanoramaMusic.Api.Routes.Identity;

public static class AuthRoutes
{
	public static void MapAuthRoutes(this WebApplication app)
	{
		var group = app.MapGroup("/api/auth").WithTags("Auth");

		group.MapPost("/login", async (LoginRequest request, LoginHandler handler, HttpResponse response, CancellationToken ct) =>
		{
			var command = new LoginCommand(request);
			var result = await handler.HandleAsync(command, ct);

			if (result.RequiresPasswordReset)
				return Results.Json(new PasswordResetRequiredResult(true, result.PasswordResetToken!), statusCode: StatusCodes.Status403Forbidden);

			response.SetRefreshTokenCookie(result.Tokens!.RefreshToken, result.Tokens.RefreshTokenExpiresAt);
			return Results.Ok(new AccessTokenResult(result.Tokens.AccessToken, result.Tokens.AccessTokenExpiresAt));
		})
		.AddEndpointFilter<ValidationFilter<LoginRequest>>()
		.MarkSensitiveResponse()
		.WithName("Login")
		.Produces<AccessTokenResult>(StatusCodes.Status200OK)
		.Produces<PasswordResetRequiredResult>(StatusCodes.Status403Forbidden)
		.Produces(StatusCodes.Status400BadRequest)
		.Produces(StatusCodes.Status401Unauthorized);

		group.MapPost("/refresh", async (HttpRequest request, HttpResponse response, RefreshTokenHandler handler, CancellationToken ct) =>
		{
			var refreshToken = request.GetRefreshTokenCookie();
			if (string.IsNullOrEmpty(refreshToken))
				return Results.Unauthorized();

			var command = new RefreshTokenCommand(new RefreshTokenRequest(refreshToken));
			var result = await handler.HandleAsync(command, ct);
			response.SetRefreshTokenCookie(result.RefreshToken, result.RefreshTokenExpiresAt);
			return Results.Ok(new AccessTokenResult(result.AccessToken, result.AccessTokenExpiresAt));
		})
		.MarkSensitiveResponse()
		.WithName("RefreshToken")
		.Produces<AccessTokenResult>(StatusCodes.Status200OK)
		.Produces(StatusCodes.Status401Unauthorized);

		group.MapPost("/logout", async (HttpRequest request, HttpResponse response, LogoutHandler handler, CancellationToken ct) =>
		{
			// Deliberately not .RequireAuthorization(): logout must still revoke the refresh
			// token even if the caller's access token has already expired. When a valid Bearer
			// token IS present, UseAuthentication() still populates HttpContext.User, so
			// LogoutHandler can denylist its jti on a best-effort basis via IAccessTokenContext.
			var command = new LogoutCommand(request.GetRefreshTokenCookie());
			await handler.HandleAsync(command, ct);
			response.ClearRefreshTokenCookie();
			return Results.NoContent();
		})
		.WithName("Logout")
		.Produces(StatusCodes.Status204NoContent);

		group.MapPost("/complete-registration", async (CompleteRegistrationRequest request, CompleteRegistrationHandler handler, CancellationToken ct) =>
		{
			var command = new CompleteRegistrationCommand(request);
			await handler.HandleAsync(command, ct);
			return Results.NoContent();
		})
		.AddEndpointFilter<ValidationFilter<CompleteRegistrationRequest>>()
		.WithName("CompleteRegistration")
		.Produces(StatusCodes.Status204NoContent)
		.Produces(StatusCodes.Status400BadRequest);

		group.MapPost("/forgot-password", async (RequestPasswordResetRequest request, RequestPasswordResetHandler handler, CancellationToken ct) =>
		{
			var command = new RequestPasswordResetCommand(request);
			await handler.HandleAsync(command, ct);
			return Results.Accepted();
		})
		.AddEndpointFilter<ValidationFilter<RequestPasswordResetRequest>>()
		.WithName("ForgotPassword")
		.Produces(StatusCodes.Status202Accepted)
		.Produces(StatusCodes.Status400BadRequest);

		group.MapPost("/reset-password", async (ResetPasswordRequest request, ResetPasswordHandler handler, CancellationToken ct) =>
		{
			var command = new ResetPasswordCommand(request);
			await handler.HandleAsync(command, ct);
			return Results.NoContent();
		})
		.AddEndpointFilter<ValidationFilter<ResetPasswordRequest>>()
		.WithName("ResetPassword")
		.Produces(StatusCodes.Status204NoContent)
		.Produces(StatusCodes.Status400BadRequest)
		.Produces(StatusCodes.Status401Unauthorized);

		// Mounted under /api/auth (not /api/sessions) so the browser sends the
		// __Secure-refresh_token cookie, which is scoped to the /api/auth path and is how
		// these endpoints identify the caller's own current session.
		var sessions = group.MapGroup("/sessions").RequireAuthorization();

		sessions
		.MapGet("/", async (HttpRequest request, GetOwnSessionsHandler handler, CancellationToken ct) =>
		{
			var command = new GetOwnSessionsCommand(request.GetRefreshTokenCookie());
			var result = await handler.HandleAsync(command, ct);
			return Results.Ok(result);
		})
		.WithName("GetOwnSessions")
		.Produces<IList<SessionResult>>(StatusCodes.Status200OK)
		.Produces(StatusCodes.Status401Unauthorized);

		sessions
		.MapDelete("/others", async (HttpRequest request, RevokeOwnOtherSessionsHandler handler, CancellationToken ct) =>
		{
			var command = new RevokeOwnOtherSessionsCommand(request.GetRefreshTokenCookie());
			await handler.HandleAsync(command, ct);
			return Results.NoContent();
		})
		.WithName("RevokeOwnOtherSessions")
		.Produces(StatusCodes.Status204NoContent)
		.Produces(StatusCodes.Status401Unauthorized);

		sessions
		.MapDelete("/{tokenId:guid}", async (Guid tokenId, HttpRequest request, RevokeOwnSessionHandler handler, CancellationToken ct) =>
		{
			var command = new RevokeOwnSessionCommand(tokenId, request.GetRefreshTokenCookie());
			await handler.HandleAsync(command, ct);
			return Results.NoContent();
		})
		.WithName("RevokeOwnSession")
		.Produces(StatusCodes.Status204NoContent)
		.Produces(StatusCodes.Status400BadRequest)
		.Produces(StatusCodes.Status401Unauthorized)
		.Produces(StatusCodes.Status404NotFound);

		var adminSessions = group.MapGroup("/admin/sessions").RequireAuthorization("AdminPolicy");

		adminSessions
		.MapGet("/", async (HttpRequest request, GetAllSessionsHandler handler, CancellationToken ct) =>
		{
			var command = new GetAllSessionsCommand(request.GetRefreshTokenCookie());
			var result = await handler.HandleAsync(command, ct);
			return Results.Ok(result);
		})
		.WithName("GetAllSessions")
		.Produces<IList<AdminSessionResult>>(StatusCodes.Status200OK)
		.Produces(StatusCodes.Status401Unauthorized)
		.Produces(StatusCodes.Status403Forbidden);

		adminSessions
		.MapDelete("/all", async (HttpRequest request, RevokeAllSessionsHandler handler, CancellationToken ct) =>
		{
			var command = new RevokeAllSessionsCommand(request.GetRefreshTokenCookie());
			await handler.HandleAsync(command, ct);
			return Results.NoContent();
		})
		.WithName("RevokeAllSessions")
		.Produces(StatusCodes.Status204NoContent)
		.Produces(StatusCodes.Status401Unauthorized)
		.Produces(StatusCodes.Status403Forbidden);

		adminSessions
		.MapDelete("/{tokenId:guid}", async (Guid tokenId, RevokeSessionHandler handler, CancellationToken ct) =>
		{
			var command = new RevokeSessionCommand(tokenId);
			await handler.HandleAsync(command, ct);
			return Results.NoContent();
		})
		.WithName("RevokeSession")
		.Produces(StatusCodes.Status204NoContent)
		.Produces(StatusCodes.Status401Unauthorized)
		.Produces(StatusCodes.Status403Forbidden)
		.Produces(StatusCodes.Status404NotFound);
	}
}