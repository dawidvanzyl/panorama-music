using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;
using PanoramaMusic.Api.Middleware;
using PanoramaMusic.Api.Routes.Identity;
using PanoramaMusic.Identity.Application.Handlers.Admin;
using PanoramaMusic.Identity.Application.Handlers.Auth;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Infrastructure.Configurations;
using PanoramaMusic.Identity.Infrastructure.Extensions;
using PanoramaMusic.Identity.Infrastructure.Services;
using System.Diagnostics.CodeAnalysis;

namespace PanoramaMusic.Identity.Integration.Tests.Fixtures;

public sealed class TestApp(WebApplication app) : IDisposable
{
	public const string TestJwtSecret = "test-jwt-secret-key-with-at-least-32-characters";

	public HttpClient Client { get; } = app.GetTestClient();

	[SuppressMessage("Reliability", "CA2012:Use ValueTasks correctly", Justification = "Unit test cleanup")]
	public void Dispose()
	{
		Client.Dispose();
		app.DisposeAsync().GetAwaiter().GetResult();
	}

	public static string GenerateAccessToken(Guid userId, IList<Role> roles)
	{
		var jwtService = new JwtService(Options.Create(new JwtOptions { Secret = TestJwtSecret }));
		return jwtService.GenerateToken(userId, roles).Token;
	}

	public static TestApp CreateTestApp(
		Mock<IUserRepository>? userRepo = null,
		Mock<IUserRoleRepository>? roleRepo = null,
		Mock<IPasswordHasher>? hasher = null,
		Mock<IJwtService>? jwt = null,
		Mock<IRefreshTokenRepository>? refreshRepo = null,
		Mock<IInviteTokenRepository>? inviteRepo = null)
	{
		var builder = WebApplication.CreateBuilder();
		builder.WebHost.UseTestServer();
		builder.Environment.EnvironmentName = "Testing";

		builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
		{
			["JWT:Secret"] = TestJwtSecret,
		});

		builder.Services.AddTransient(_ => (userRepo ?? new Mock<IUserRepository>()).Object);
		builder.Services.AddTransient(_ => (roleRepo ?? new Mock<IUserRoleRepository>()).Object);
		builder.Services.AddTransient(_ => (hasher ?? new Mock<IPasswordHasher>()).Object);
		builder.Services.AddTransient(_ => (jwt ?? new Mock<IJwtService>()).Object);
		builder.Services.AddTransient(_ => (refreshRepo ?? new Mock<IRefreshTokenRepository>()).Object);
		builder.Services.AddTransient(_ => (inviteRepo ?? new Mock<IInviteTokenRepository>()).Object);

		builder.Services.AddTransient<LoginHandler>();
		builder.Services.AddTransient<RefreshTokenHandler>();
		builder.Services.AddTransient<LogoutHandler>();
		builder.Services.AddTransient<CompleteRegistrationHandler>();
		builder.Services.AddTransient<CreateUserHandler>();
		builder.Services.AddTransient<RegenerateInviteTokenHandler>();
		builder.Services.AddTransient<GetUsersHandler>();

		builder.Services.AddIdentityAuthentication(builder.Configuration);

		builder.Services.AddExceptionHandler<DomainExceptionHandler>();
		builder.Services.AddProblemDetails();

		var app = builder.Build();
		app.UseExceptionHandler();
		app.UseAuthentication();
		app.UseAuthorization();
		app.MapAuthRoutes();
		app.MapAdminRoutes();

		app
			.StartAsync()
			.GetAwaiter()
			.GetResult();

		return new TestApp(app);
	}
}