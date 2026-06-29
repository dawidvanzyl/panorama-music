using PanoramaMusic.Api.Extensions;
using PanoramaMusic.Api.Filters;
using PanoramaMusic.Identity.Application.Commands.Auth;
using PanoramaMusic.Identity.Application.Handlers.Auth;
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
			response.SetRefreshTokenCookie(result.RefreshToken, result.RefreshTokenExpiresAt);
			return Results.Ok(new AccessTokenResult(result.AccessToken, result.AccessTokenExpiresAt));
		})
		.AddEndpointFilter<ValidationFilter<LoginRequest>>()
		.MarkSensitiveResponse()
		.WithName("Login")
		.Produces<AccessTokenResult>(StatusCodes.Status200OK)
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
	}
}