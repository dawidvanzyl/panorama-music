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
using PanoramaMusic.Identity.Integration.Tests.Fixtures;
using Shouldly;
using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace PanoramaMusic.Identity.Tests;

public sealed class AuthFlowTests(AuthFlowFixture fixture) : IClassFixture<AuthFlowFixture>
{
	public Mock<IUserRepository> UserRepo { get; } = new Mock<IUserRepository>();
	public Mock<IUserRoleRepository> RoleRepo { get; } = new Mock<IUserRoleRepository>();
	public Mock<IRefreshTokenRepository> RefreshRepo { get; } = new Mock<IRefreshTokenRepository>();
	public Mock<IInviteTokenRepository> InviteRepo { get; } = new Mock<IInviteTokenRepository>();
	public Mock<IPasswordHasher> Hasher { get; } = new Mock<IPasswordHasher>();
	public Mock<IJwtService> Jwt { get; } = new Mock<IJwtService>();

	[Fact]
	[Trait("AC", "M1IT1")]
	public async Task LoginFlow_ReturnsAccessAndRefreshTokens()
	{
		var user = fixture.CreateActiveUser();

		UserRepo
			.Setup(r => r.GetByEmailAsync("flow@test.com", It.IsAny<CancellationToken>()))
			.ReturnsAsync(user);

		RoleRepo
			.Setup(r => r.GetRolesAsync(user.UserId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([Role.Teacher]);

		Hasher
			.Setup(h => h.Verify("mypassword", It.IsAny<PasswordHash>()))
			.Returns(true);

		Jwt
			.Setup(j => j.GenerateToken(user.UserId, It.IsAny<IList<Role>>()))
			.Returns(new JwtToken("jwt-flow-token", fixture.FixedNow.AddMinutes(15)));

		using var app = TestApp.CreateTestApp(UserRepo, RoleRepo, Hasher, Jwt);
		var response = await app.Client.PostAsJsonAsync("/api/auth/login", new LoginRequest("flow@test.com", "mypassword"), TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.OK);
		var result = await response.Content.ReadFromJsonAsync<AuthResult>(TestContext.Current.CancellationToken);
		result.ShouldNotBeNull();
		result.AccessToken.ShouldNotBeNullOrEmpty();
		result.RefreshToken.ShouldNotBeNullOrEmpty();
		result.AccessTokenExpiresAt.ShouldBeGreaterThan(fixture.FixedNow);
		result.RefreshTokenExpiresAt.ShouldBeGreaterThan(fixture.FixedNow);
	}

	[Fact]
	[Trait("AC", "M1IT2")]
	public async Task LoginFlow_InvalidCredentials()
	{
		UserRepo
			.Setup(r => r.GetByEmailAsync("unknown@test.com", It.IsAny<CancellationToken>()))
			.ReturnsAsync((User?)null);

		using var app = TestApp.CreateTestApp(userRepo: UserRepo);
		var response = await app.Client.PostAsJsonAsync("/api/auth/login", new LoginRequest("unknown@test.com", "wrong-password"), TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
	}

	[Fact]
	[Trait("AC", "M1IT3")]
	public async Task RefreshFlow_RotatesToken()
	{
		var user = fixture.CreateActiveUser();
		var token = fixture.CreateValidRefreshToken(user.UserId);

		RefreshRepo
			.Setup(r => r.GetByTokenHashAsync(fixture.TestTokenHash, It.IsAny<CancellationToken>()))
			.ReturnsAsync(token);

		UserRepo
			.Setup(r => r.GetByIdAsync(user.UserId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(user);

		RoleRepo
			.Setup(r => r.GetRolesAsync(user.UserId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([Role.Admin]);

		Jwt
			.Setup(j => j.GenerateToken(user.UserId, It.IsAny<IList<Role>>()))
			.Returns(new JwtToken("rotated-jwt", fixture.FixedNow.AddMinutes(15)));

		RefreshRepo
			.Setup(r => r.RotateAsync(token.TokenId, It.IsAny<RefreshToken>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		using var app = TestApp.CreateTestApp(UserRepo, RoleRepo, jwt: Jwt, refreshRepo: RefreshRepo);
		var response = await app.Client.PostAsJsonAsync("/api/auth/refresh", new RefreshTokenRequest(fixture.TestToken), TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.OK);
		RefreshRepo.Verify(r => r.RotateAsync(token.TokenId, It.IsAny<RefreshToken>(), It.IsAny<CancellationToken>()), Times.Once);
	}

	[Fact]
	[Trait("AC", "M1IT4")]
	public async Task LogoutFlow_RevokesRefreshToken()
	{
		var userId = Guid.NewGuid();
		var token = fixture.CreateValidRefreshToken(userId);

		RefreshRepo
			.Setup(r => r.GetByTokenHashAsync(fixture.TestTokenHash, It.IsAny<CancellationToken>()))
			.ReturnsAsync(token);

		RefreshRepo
			.Setup(r => r.UpdateAsync(It.IsAny<RefreshToken>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		using var app = TestApp.CreateTestApp(refreshRepo: RefreshRepo);
		var response = await app.Client.PostAsJsonAsync("/api/auth/logout", new RefreshTokenRequest(fixture.TestToken), TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.NoContent);
		token.IsRevoked.ShouldBeTrue();
	}

	[Fact]
	[Trait("AC", "M1.1IT1")]
	public async Task CompleteRegistrationFlow_WeakPassword_Returns422()
	{
		using var app = TestApp.CreateTestApp();
		var response = await app.Client.PostAsJsonAsync("/api/auth/complete-registration", new CompleteRegistrationRequest("any-token", "weak"), TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.UnprocessableEntity);
	}

	[Fact]
	[Trait("AC", "M1IT5")]
	public async Task CompleteRegistrationFlow_ActivatesUser()
	{
		var user = new User(Guid.NewGuid(), Email.Create("invited@test.com"), fixture.FixedNow);
		var inviteToken = fixture.CreateValidInviteToken(user.UserId);

		InviteRepo
			.Setup(r => r.GetByTokenHashAsync(fixture.TestTokenHash, It.IsAny<CancellationToken>()))
			.ReturnsAsync(inviteToken);

		UserRepo
			.Setup(r => r.GetByIdAsync(user.UserId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(user);

		Hasher
			.Setup(h => h.Hash("NewPass123!"))
			.Returns(PasswordHash.Create("$argon2id$v=19$new-hash"));

		UserRepo.Setup(r => r.CompleteActivationAsync(It.IsAny<User>(), inviteToken.TokenId, It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		using var app = TestApp.CreateTestApp(userRepo: UserRepo, hasher: Hasher, inviteRepo: InviteRepo);
		var response = await app.Client.PostAsJsonAsync("/api/auth/complete-registration", new CompleteRegistrationRequest(fixture.TestToken, "NewPass123!"), TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.NoContent);
		user.IsActive.ShouldBeTrue();
		user.PasswordHash.ShouldNotBeNull();
	}
}