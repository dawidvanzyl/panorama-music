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
		.WithName("Login")
		.Produces<AuthResult>(StatusCodes.Status200OK)
		.Produces(StatusCodes.Status401Unauthorized);

		group.MapPost("/refresh", async (RefreshTokenRequest request, RefreshTokenHandler handler, CancellationToken ct) =>
		{
			var command = new RefreshTokenCommand(request);
			var result = await handler.HandleAsync(command, ct);
			return Results.Ok(result);
		})
		.WithName("RefreshToken")
		.Produces<AuthResult>(StatusCodes.Status200OK)
		.Produces(StatusCodes.Status401Unauthorized);

		group.MapPost("/logout", async (RefreshTokenRequest request, LogoutHandler handler, CancellationToken ct) =>
		{
			var command = new LogoutCommand(request.Token);
			await handler.HandleAsync(command, ct);
			return Results.NoContent();
		})
		.WithName("Logout")
		.Produces(StatusCodes.Status204NoContent)
		.Produces(StatusCodes.Status401Unauthorized);

		group.MapPost("/complete-registration", async (CompleteRegistrationRequest request, CompleteRegistrationHandler handler, CancellationToken ct) =>
		{
			var command = new CompleteRegistrationCommand(request);
			await handler.HandleAsync(command, ct);
			return Results.NoContent();
		})
		.WithName("CompleteRegistration")
		.Produces(StatusCodes.Status204NoContent)
		.Produces(StatusCodes.Status400BadRequest);
	}
}