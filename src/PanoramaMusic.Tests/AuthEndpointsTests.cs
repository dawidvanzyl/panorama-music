using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Api.Middleware;
using PanoramaMusic.Api.Routes.Identity;
using PanoramaMusic.Identity.Application;
using PanoramaMusic.Identity.Application.Handlers.Auth;
using PanoramaMusic.Identity.Application.Models;
using PanoramaMusic.Identity.Application.Requests.Auth;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;
using Shouldly;
using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace PanoramaMusic.Tests;

public sealed class AuthEndpointsTests
{
	private static readonly DateTime _fixedNow = new(2026, 6, 5, 12, 0, 0, DateTimeKind.Utc);
	private static readonly string _testRefreshToken = "test-refresh-token-raw";
	private static readonly string _testRefreshTokenHash = TokenHasher.ComputeSha256Hash(_testRefreshToken);

	private static InviteToken CreateValidInviteToken(Guid userId)
	{
		return new InviteToken(Guid.NewGuid(), userId, _testRefreshTokenHash, _fixedNow.AddDays(7));
	}

	private static User CreateActiveUser(string email = "user@test.com")
	{
		var user = new User(Guid.NewGuid(), Email.Create(email), _fixedNow);
		user.SetPassword(PasswordHash.Create("$argon2id$v=19$valid-hash"));
		user.Activate();
		return user;
	}

	private static RefreshToken CreateValidRefreshToken(Guid userId)
	{
		return new RefreshToken(Guid.NewGuid(), userId, _testRefreshTokenHash, _fixedNow.AddDays(7));
	}

	private sealed class TestApp : IDisposable
	{
		private readonly WebApplication _app;
		public HttpClient Client { get; }

		public TestApp(WebApplication app)
		{
			_app = app;
			Client = app.GetTestClient();
		}

		public void Dispose()
		{
			Client.Dispose();
			_app.DisposeAsync().GetAwaiter().GetResult();
		}
	}

	private static TestApp CreateTestApp(
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

		app.StartAsync().GetAwaiter().GetResult();
		return new TestApp(app);
	}

	[Fact]
	[Trait("AC", "M1UC35")]
	public async Task PostLogin_ValidCredentials_Returns200WithAuthResult()
	{
		var user = CreateActiveUser();
		var userRepo = new Mock<IUserRepository>();
		var roleRepo = new Mock<IUserRoleRepository>();
		var hasher = new Mock<IPasswordHasher>();
		var jwt = new Mock<IJwtService>();
		var refreshRepo = new Mock<IRefreshTokenRepository>();

		userRepo.Setup(r => r.GetByEmailAsync("valid@test.com", It.IsAny<CancellationToken>()))
			.ReturnsAsync(user);
		roleRepo.Setup(r => r.GetRolesAsync(user.UserId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([Role.Admin]);
		hasher.Setup(h => h.Verify("correct-password", It.IsAny<PasswordHash>()))
			.Returns(true);
		jwt.Setup(j => j.GenerateToken(user.UserId, It.IsAny<IList<Role>>()))
			.Returns(new JwtToken("jwt-access-token", _fixedNow.AddMinutes(15)));
		refreshRepo.Setup(r => r.AddAsync(It.IsAny<RefreshToken>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		using var app = CreateTestApp(userRepo, roleRepo, hasher, jwt, refreshRepo);
		var response = await app.Client.PostAsJsonAsync("/api/auth/login",
			new LoginRequest("valid@test.com", "correct-password"));

		response.StatusCode.ShouldBe(HttpStatusCode.OK);
		var result = await response.Content.ReadFromJsonAsync<AuthResult>();
		result.ShouldNotBeNull();
		result.AccessToken.ShouldBe("jwt-access-token");
		result.RefreshToken.ShouldNotBeNullOrEmpty();
		result.AccessTokenExpiresAt.ShouldBe(_fixedNow.AddMinutes(15));
	}

	[Fact]
	[Trait("AC", "M1UC36")]
	public async Task PostLogin_InvalidCredentials_Returns401()
	{
		var userRepo = new Mock<IUserRepository>();
		userRepo.Setup(r => r.GetByEmailAsync("unknown@test.com", It.IsAny<CancellationToken>()))
			.ReturnsAsync((User?)null);

		using var app = CreateTestApp(userRepo: userRepo);
		var response = await app.Client.PostAsJsonAsync("/api/auth/login",
			new LoginRequest("unknown@test.com", "wrong-password"));

		response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
	}

	[Fact]
	[Trait("AC", "M1UC37")]
	public async Task PostRefresh_ValidToken_Returns200WithNewAuthResult()
	{
		var user = CreateActiveUser();
		var token = CreateValidRefreshToken(user.UserId);
		var refreshRepo = new Mock<IRefreshTokenRepository>();
		var userRepo = new Mock<IUserRepository>();
		var roleRepo = new Mock<IUserRoleRepository>();
		var jwt = new Mock<IJwtService>();

		refreshRepo.Setup(r => r.GetByTokenHashAsync(_testRefreshTokenHash, It.IsAny<CancellationToken>()))
			.ReturnsAsync(token);
		userRepo.Setup(r => r.GetByIdAsync(user.UserId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(user);
		roleRepo.Setup(r => r.GetRolesAsync(user.UserId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([Role.Teacher]);
		jwt.Setup(j => j.GenerateToken(user.UserId, It.IsAny<IList<Role>>()))
			.Returns(new JwtToken("new-jwt-token", _fixedNow.AddMinutes(15)));
		refreshRepo.Setup(r => r.RotateAsync(token.TokenId, It.IsAny<RefreshToken>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		using var app = CreateTestApp(userRepo, roleRepo, jwt: jwt, refreshRepo: refreshRepo);
		var response = await app.Client.PostAsJsonAsync("/api/auth/refresh",
			new RefreshTokenRequest(_testRefreshToken));

		response.StatusCode.ShouldBe(HttpStatusCode.OK);
		var result = await response.Content.ReadFromJsonAsync<AuthResult>();
		result.ShouldNotBeNull();
		result.AccessToken.ShouldBe("new-jwt-token");
		result.RefreshToken.ShouldNotBeNullOrEmpty();
	}

	[Fact]
	[Trait("AC", "M1UC38")]
	public async Task PostCompleteRegistration_ValidToken_Returns204()
	{
		var user = new User(Guid.NewGuid(), Email.Create("newuser@test.com"), _fixedNow);
		var inviteToken = CreateValidInviteToken(user.UserId);
		var inviteRepo = new Mock<IInviteTokenRepository>();
		var userRepo = new Mock<IUserRepository>();
		var hasher = new Mock<IPasswordHasher>();

		inviteRepo.Setup(r => r.GetByTokenHashAsync(_testRefreshTokenHash, It.IsAny<CancellationToken>()))
			.ReturnsAsync(inviteToken);
		userRepo.Setup(r => r.GetByIdAsync(user.UserId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(user);
		hasher.Setup(h => h.Hash("StrongPass1!"))
			.Returns(PasswordHash.Create("$argon2id$v=19$new-hash"));
		userRepo.Setup(r => r.CompleteActivationAsync(It.IsAny<User>(), inviteToken.TokenId, It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		using var app = CreateTestApp(userRepo: userRepo, hasher: hasher, inviteRepo: inviteRepo);
		var response = await app.Client.PostAsJsonAsync("/api/auth/complete-registration",
			new CompleteRegistrationRequest(_testRefreshToken, "StrongPass1!"));

		response.StatusCode.ShouldBe(HttpStatusCode.NoContent);
	}

	[Fact]
	[Trait("AC", "M1UC39")]
	public async Task PostLogout_ValidToken_Returns204()
	{
		var userId = Guid.NewGuid();
		var token = CreateValidRefreshToken(userId);
		var refreshRepo = new Mock<IRefreshTokenRepository>();

		refreshRepo.Setup(r => r.GetByTokenHashAsync(_testRefreshTokenHash, It.IsAny<CancellationToken>()))
			.ReturnsAsync(token);
		refreshRepo.Setup(r => r.UpdateAsync(It.IsAny<RefreshToken>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		using var app = CreateTestApp(refreshRepo: refreshRepo);
		var response = await app.Client.PostAsJsonAsync("/api/auth/logout",
			new RefreshTokenRequest(_testRefreshToken));

		response.StatusCode.ShouldBe(HttpStatusCode.NoContent);
	}
}