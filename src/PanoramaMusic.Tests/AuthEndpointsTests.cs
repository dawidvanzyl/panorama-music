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

	private static InviteToken CreateValidInviteToken(Guid userId)
	{
		return new InviteToken(Guid.NewGuid(), userId, _testRefreshTokenHash, _fixedNow.AddDays(7));
	}

	private static HttpClient CreateClient(
		Mock<IUserRepository>? userRepo = null,
		Mock<IUserRoleRepository>? roleRepo = null,
		Mock<IPasswordHasher>? hasher = null,
		Mock<IJwtService>? jwt = null,
		Mock<IRefreshTokenRepository>? refreshRepo = null,
		Mock<IInviteTokenRepository>? inviteRepo = null)
	{
		Environment.SetEnvironmentVariable("JWT_SECRET",
			"test-secret-key-that-is-at-least-thirty-two-characters!");

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
		return app.GetTestClient();
	}

	#region UC — Backend endpoint behaviour

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

		userRepo.Setup(r => r.GetByEmailAsync("valid@test.com", default))
			.ReturnsAsync(user);
		roleRepo.Setup(r => r.GetRolesAsync(user.UserId, default))
			.ReturnsAsync([Role.Admin]);
		hasher.Setup(h => h.Verify("correct-password", It.IsAny<PasswordHash>()))
			.Returns(true);
		jwt.Setup(j => j.GenerateToken(user.UserId, It.IsAny<IList<Role>>()))
			.Returns(new JwtToken("jwt-access-token", _fixedNow.AddMinutes(15)));
		refreshRepo.Setup(r => r.AddAsync(It.IsAny<RefreshToken>(), default))
			.Returns(Task.CompletedTask);

		using var client = CreateClient(userRepo, roleRepo, hasher, jwt, refreshRepo);
		var response = await client.PostAsJsonAsync("/api/auth/login",
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
		userRepo.Setup(r => r.GetByEmailAsync("unknown@test.com", default))
			.ReturnsAsync((User?)null);

		using var client = CreateClient(userRepo: userRepo);
		var response = await client.PostAsJsonAsync("/api/auth/login",
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

		refreshRepo.Setup(r => r.GetByTokenHashAsync(_testRefreshTokenHash, default))
			.ReturnsAsync(token);
		userRepo.Setup(r => r.GetByIdAsync(user.UserId, default))
			.ReturnsAsync(user);
		roleRepo.Setup(r => r.GetRolesAsync(user.UserId, default))
			.ReturnsAsync([Role.Teacher]);
		jwt.Setup(j => j.GenerateToken(user.UserId, It.IsAny<IList<Role>>()))
			.Returns(new JwtToken("new-jwt-token", _fixedNow.AddMinutes(15)));
		refreshRepo.Setup(r => r.RotateAsync(token.TokenId, It.IsAny<RefreshToken>(), default))
			.Returns(Task.CompletedTask);

		using var client = CreateClient(userRepo, roleRepo, jwt: jwt, refreshRepo: refreshRepo);
		var response = await client.PostAsJsonAsync("/api/auth/refresh",
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

		inviteRepo.Setup(r => r.GetByTokenHashAsync(_testRefreshTokenHash, default))
			.ReturnsAsync(inviteToken);
		userRepo.Setup(r => r.GetByIdAsync(user.UserId, default))
			.ReturnsAsync(user);
		hasher.Setup(h => h.Hash("StrongPass1!"))
			.Returns(PasswordHash.Create("$argon2id$v=19$new-hash"));
		userRepo.Setup(r => r.CompleteActivationAsync(It.IsAny<User>(), inviteToken.TokenId, default))
			.Returns(Task.CompletedTask);

		using var client = CreateClient(userRepo: userRepo, hasher: hasher, inviteRepo: inviteRepo);
		var response = await client.PostAsJsonAsync("/api/auth/complete-registration",
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

		refreshRepo.Setup(r => r.GetByTokenHashAsync(_testRefreshTokenHash, default))
			.ReturnsAsync(token);
		refreshRepo.Setup(r => r.UpdateAsync(It.IsAny<RefreshToken>(), default))
			.Returns(Task.CompletedTask);

		using var client = CreateClient(refreshRepo: refreshRepo);
		var response = await client.PostAsJsonAsync("/api/auth/logout",
			new RefreshTokenRequest(_testRefreshToken));

		response.StatusCode.ShouldBe(HttpStatusCode.NoContent);
	}

	#endregion

	#region IT — Integration tests

	[Fact]
	[Trait("AC", "M1IT1")]
	public async Task LoginFlow_ReturnsAccessAndRefreshTokens()
	{
		var user = CreateActiveUser();
		var userRepo = new Mock<IUserRepository>();
		var roleRepo = new Mock<IUserRoleRepository>();
		var hasher = new Mock<IPasswordHasher>();
		var jwt = new Mock<IJwtService>();

		userRepo.Setup(r => r.GetByEmailAsync("flow@test.com", default))
			.ReturnsAsync(user);
		roleRepo.Setup(r => r.GetRolesAsync(user.UserId, default))
			.ReturnsAsync([Role.Teacher]);
		hasher.Setup(h => h.Verify("mypassword", It.IsAny<PasswordHash>()))
			.Returns(true);
		jwt.Setup(j => j.GenerateToken(user.UserId, It.IsAny<IList<Role>>()))
			.Returns(new JwtToken("jwt-flow-token", _fixedNow.AddMinutes(15)));

		using var client = CreateClient(userRepo, roleRepo, hasher, jwt);
		var response = await client.PostAsJsonAsync("/api/auth/login",
			new LoginRequest("flow@test.com", "mypassword"));

		response.StatusCode.ShouldBe(HttpStatusCode.OK);
		var result = await response.Content.ReadFromJsonAsync<AuthResult>();
		result.ShouldNotBeNull();
		result.AccessToken.ShouldNotBeNullOrEmpty();
		result.RefreshToken.ShouldNotBeNullOrEmpty();
		result.AccessTokenExpiresAt.ShouldBeGreaterThan(_fixedNow);
		result.RefreshTokenExpiresAt.ShouldBeGreaterThan(_fixedNow);
	}

	[Fact]
	[Trait("AC", "M1IT2")]
	public async Task RefreshFlow_RotatesToken()
	{
		var user = CreateActiveUser();
		var token = CreateValidRefreshToken(user.UserId);
		var refreshRepo = new Mock<IRefreshTokenRepository>();
		var userRepo = new Mock<IUserRepository>();
		var roleRepo = new Mock<IUserRoleRepository>();
		var jwt = new Mock<IJwtService>();

		refreshRepo.Setup(r => r.GetByTokenHashAsync(_testRefreshTokenHash, default))
			.ReturnsAsync(token);
		userRepo.Setup(r => r.GetByIdAsync(user.UserId, default))
			.ReturnsAsync(user);
		roleRepo.Setup(r => r.GetRolesAsync(user.UserId, default))
			.ReturnsAsync([Role.Admin]);
		jwt.Setup(j => j.GenerateToken(user.UserId, It.IsAny<IList<Role>>()))
			.Returns(new JwtToken("rotated-jwt", _fixedNow.AddMinutes(15)));
		refreshRepo.Setup(r => r.RotateAsync(token.TokenId, It.IsAny<RefreshToken>(), default))
			.Returns(Task.CompletedTask);

		using var client = CreateClient(userRepo, roleRepo, jwt: jwt, refreshRepo: refreshRepo);
		var response = await client.PostAsJsonAsync("/api/auth/refresh",
			new RefreshTokenRequest(_testRefreshToken));

		response.StatusCode.ShouldBe(HttpStatusCode.OK);
		refreshRepo.Verify(r => r.RotateAsync(token.TokenId, It.IsAny<RefreshToken>(), default), Times.Once);
	}

	[Fact]
	[Trait("AC", "M1IT3")]
	public async Task LogoutFlow_RevokesRefreshToken()
	{
		var userId = Guid.NewGuid();
		var token = CreateValidRefreshToken(userId);
		var refreshRepo = new Mock<IRefreshTokenRepository>();

		refreshRepo.Setup(r => r.GetByTokenHashAsync(_testRefreshTokenHash, default))
			.ReturnsAsync(token);
		refreshRepo.Setup(r => r.UpdateAsync(It.IsAny<RefreshToken>(), default))
			.Returns(Task.CompletedTask);

		using var client = CreateClient(refreshRepo: refreshRepo);
		var response = await client.PostAsJsonAsync("/api/auth/logout",
			new RefreshTokenRequest(_testRefreshToken));

		response.StatusCode.ShouldBe(HttpStatusCode.NoContent);
		token.IsRevoked.ShouldBeTrue();
	}

	[Fact]
	[Trait("AC", "M1IT4")]
	public async Task CompleteRegistrationFlow_ActivatesUser()
	{
		var user = new User(Guid.NewGuid(), Email.Create("invited@test.com"), _fixedNow);
		var inviteToken = CreateValidInviteToken(user.UserId);
		var inviteRepo = new Mock<IInviteTokenRepository>();
		var userRepo = new Mock<IUserRepository>();
		var hasher = new Mock<IPasswordHasher>();

		inviteRepo.Setup(r => r.GetByTokenHashAsync(_testRefreshTokenHash, default))
			.ReturnsAsync(inviteToken);
		userRepo.Setup(r => r.GetByIdAsync(user.UserId, default))
			.ReturnsAsync(user);
		hasher.Setup(h => h.Hash("NewPass123!"))
			.Returns(PasswordHash.Create("$argon2id$v=19$new-hash"));
		userRepo.Setup(r => r.CompleteActivationAsync(It.IsAny<User>(), inviteToken.TokenId, default))
			.Returns(Task.CompletedTask);

		using var client = CreateClient(userRepo: userRepo, hasher: hasher, inviteRepo: inviteRepo);
		var response = await client.PostAsJsonAsync("/api/auth/complete-registration",
			new CompleteRegistrationRequest(_testRefreshToken, "NewPass123!"));

		response.StatusCode.ShouldBe(HttpStatusCode.NoContent);
		user.IsActive.ShouldBeTrue();
		user.PasswordHash.ShouldNotBeNull();
	}

	#endregion
}