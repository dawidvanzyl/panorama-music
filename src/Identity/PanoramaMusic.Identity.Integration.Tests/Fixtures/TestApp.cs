using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Api.Middleware;
using PanoramaMusic.Api.Routes.Identity;
using PanoramaMusic.Identity.Application.Handlers.Auth;
using PanoramaMusic.Identity.Domain.Interfaces;
using System.Diagnostics.CodeAnalysis;

namespace PanoramaMusic.Identity.Integration.Tests.Fixtures;

public sealed class TestApp(WebApplication app) : IDisposable
{
	public HttpClient Client { get; } = app.GetTestClient();

	[SuppressMessage("Reliability", "CA2012:Use ValueTasks correctly", Justification = "Unit test cleanup")]
	public void Dispose()
	{
		Client.Dispose();
		app.DisposeAsync().GetAwaiter().GetResult();
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

		builder.Services.AddExceptionHandler<DomainExceptionHandler>();
		builder.Services.AddProblemDetails();

		var app = builder.Build();
		app.UseExceptionHandler();
		app.MapAuthRoutes();

		app
			.StartAsync()
			.GetAwaiter()
			.GetResult();

		return new TestApp(app);
	}
}