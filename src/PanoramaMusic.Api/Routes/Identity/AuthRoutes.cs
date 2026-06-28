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

		group.MapPost("/login", async (LoginRequest request, LoginHandler handler, CancellationToken ct) =>
		{
			var command = new LoginCommand(request);
			var result = await handler.HandleAsync(command, ct);
			return Results.Ok(result);
		})
		.AddEndpointFilter<ValidationFilter<LoginRequest>>()
		.MarkSensitiveResponse()
		.WithName("Login")
		.Produces<AuthResult>(StatusCodes.Status200OK)
		.Produces(StatusCodes.Status400BadRequest)
		.Produces(StatusCodes.Status401Unauthorized);

		group.MapPost("/refresh", async (RefreshTokenRequest request, RefreshTokenHandler handler, CancellationToken ct) =>
		{
			var command = new RefreshTokenCommand(request);
			var result = await handler.HandleAsync(command, ct);
			return Results.Ok(result);
		})
		.AddEndpointFilter<ValidationFilter<RefreshTokenRequest>>()
		.MarkSensitiveResponse()
		.WithName("RefreshToken")
		.Produces<AuthResult>(StatusCodes.Status200OK)
		.Produces(StatusCodes.Status400BadRequest)
		.Produces(StatusCodes.Status401Unauthorized);

		group.MapPost("/logout", async (RefreshTokenRequest request, LogoutHandler handler, CancellationToken ct) =>
		{
			var command = new LogoutCommand(request.Token);
			await handler.HandleAsync(command, ct);
			return Results.NoContent();
		})
		.AddEndpointFilter<ValidationFilter<RefreshTokenRequest>>()
		.WithName("Logout")
		.Produces(StatusCodes.Status204NoContent)
		.Produces(StatusCodes.Status400BadRequest)
		.Produces(StatusCodes.Status401Unauthorized);

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