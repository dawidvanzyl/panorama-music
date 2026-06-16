using Moq;
using PanoramaMusic.Api.Routes.Identity;
using PanoramaMusic.Identity.Application.Models;
using PanoramaMusic.Identity.Application.Requests.Admin;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;
using PanoramaMusic.Identity.Integration.Tests.Fixtures;
using Shouldly;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Xunit;

namespace PanoramaMusic.Identity.Tests;

public sealed class AdminFlowTests(AuthFlowFixture fixture) : IClassFixture<AuthFlowFixture>
{
	public Mock<IUserRepository> UserRepo { get; } = new Mock<IUserRepository>();
	public Mock<IUserRoleRepository> RoleRepo { get; } = new Mock<IUserRoleRepository>();
	public Mock<IInviteTokenRepository> InviteRepo { get; } = new Mock<IInviteTokenRepository>();

	[Fact]
	[Trait("AC", "M1IT6")]
	public async Task CreateUserFlow_AdminCreatesUser_ReturnsInviteUrl()
	{
		UserRepo
			.Setup(r => r.GetByEmailAsync("invitee@test.com", It.IsAny<CancellationToken>()))
			.ReturnsAsync((User?)null);

		UserRepo
			.Setup(r => r.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		RoleRepo
			.Setup(r => r.AddAsync(It.IsAny<UserRole>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		InviteRepo
			.Setup(r => r.AddAsync(It.IsAny<InviteToken>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		using var app = TestApp.CreateTestApp(userRepo: UserRepo, roleRepo: RoleRepo, inviteRepo: InviteRepo);
		var token = TestApp.GenerateAccessToken(Guid.NewGuid(), [Role.Admin]);
		app.Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

		var response = await app.Client.PostAsJsonAsync("/api/users", new CreateUserRequest("invitee@test.com", Role.Teacher), TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.Created);
		var result = await response.Content.ReadFromJsonAsync<CreateUserResult>(TestContext.Current.CancellationToken);
		result.ShouldNotBeNull();
		result.UserId.ShouldNotBe(Guid.Empty);
		result.InviteUrl.ShouldNotBeNullOrEmpty();
	}

	[Fact]
	[Trait("AC", "M1IT7")]
	public async Task RegenerateInviteFlow_AdminRegeneratesInvite_ReturnsNewInviteUrl()
	{
		var user = fixture.CreateActiveUser("regenerate@test.com");

		UserRepo
			.Setup(r => r.GetByIdAsync(user.UserId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(user);

		InviteRepo
			.Setup(r => r.RevokeAllForUserAsync(user.UserId, It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		InviteRepo
			.Setup(r => r.AddAsync(It.IsAny<InviteToken>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		using var app = TestApp.CreateTestApp(userRepo: UserRepo, inviteRepo: InviteRepo);
		var token = TestApp.GenerateAccessToken(Guid.NewGuid(), [Role.Admin]);
		app.Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

		var response = await app.Client.PostAsync($"/api/users/{user.UserId}/invite", null, TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.OK);
		var result = await response.Content.ReadFromJsonAsync<RegenerateInviteTokenResult>(TestContext.Current.CancellationToken);
		result.ShouldNotBeNull();
		result.InviteUrl.ShouldNotBeNullOrEmpty();
		InviteRepo.Verify(r => r.RevokeAllForUserAsync(user.UserId, It.IsAny<CancellationToken>()), Times.Once);
	}

	[Fact]
	[Trait("AC", "M1IT8")]
	public async Task CreateUserFlow_TeacherRole_Forbidden()
	{
		using var app = TestApp.CreateTestApp();
		var token = TestApp.GenerateAccessToken(Guid.NewGuid(), [Role.Teacher]);
		app.Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

		var response = await app.Client.PostAsJsonAsync("/api/users", new CreateUserRequest("blocked@test.com", Role.Teacher), TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
	}

	[Fact]
	[Trait("AC", "M1IT8")]
	public async Task RegenerateInviteFlow_TeacherRole_Forbidden()
	{
		using var app = TestApp.CreateTestApp();
		var token = TestApp.GenerateAccessToken(Guid.NewGuid(), [Role.Teacher]);
		app.Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

		var response = await app.Client.PostAsync($"/api/users/{Guid.NewGuid()}/invite", null, TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
	}

	[Fact]
	[Trait("AC", "M1IT8")]
	public async Task GetUsersFlow_NoToken_Unauthorized()
	{
		using var app = TestApp.CreateTestApp();

		var response = await app.Client.GetAsync("/api/users", TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
	}

	[Fact]
	[Trait("AC", "M1IT8")]
	public async Task GetUsersFlow_TeacherRole_Forbidden()
	{
		using var app = TestApp.CreateTestApp();
		var token = TestApp.GenerateAccessToken(Guid.NewGuid(), [Role.Teacher]);
		app.Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

		var response = await app.Client.GetAsync("/api/users", TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
	}
}