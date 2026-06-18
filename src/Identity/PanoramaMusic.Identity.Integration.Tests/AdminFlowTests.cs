using Moq;
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

namespace PanoramaMusic.Identity.Integration.Tests;

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

		var response = await app.Client.PostAsJsonAsync("/api/users", new CreateUserRequest("invitee@test.com", [Role.Teacher]), TestContext.Current.CancellationToken);

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
			.Setup(r => r.RevokeAndIssueAsync(user.UserId, It.IsAny<InviteToken>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		using var app = TestApp.CreateTestApp(userRepo: UserRepo, inviteRepo: InviteRepo);
		var token = TestApp.GenerateAccessToken(Guid.NewGuid(), [Role.Admin]);
		app.Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

		var response = await app.Client.PostAsync($"/api/users/{user.UserId}/invite", null, TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.OK);
		var result = await response.Content.ReadFromJsonAsync<RegenerateInviteTokenResult>(TestContext.Current.CancellationToken);
		result.ShouldNotBeNull();
		result.InviteUrl.ShouldNotBeNullOrEmpty();
		InviteRepo.Verify(r => r.RevokeAndIssueAsync(user.UserId, It.IsAny<InviteToken>(), It.IsAny<CancellationToken>()), Times.Once);
	}

	[Fact]
	[Trait("AC", "M1IT8")]
	public async Task CreateUserFlow_TeacherRole_Forbidden()
	{
		using var app = TestApp.CreateTestApp();
		var token = TestApp.GenerateAccessToken(Guid.NewGuid(), [Role.Teacher]);
		app.Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

		var response = await app.Client.PostAsJsonAsync("/api/users", new CreateUserRequest("blocked@test.com", [Role.Teacher]), TestContext.Current.CancellationToken);

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

	[Fact]
	[Trait("AC", "M1.1IT4")]
	public async Task UpdateUserRolesFlow_AdminUpdatesRoles_Returns200WithUpdatedUser()
	{
		var user = fixture.CreateActiveUser("edit-roles@test.com");
		var newRoles = new List<Role> { Role.Teacher, Role.Admin };

		UserRepo
			.Setup(r => r.GetByIdAsync(user.UserId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(user);

		RoleRepo
			.Setup(r => r.SetRolesAsync(user.UserId, It.IsAny<IList<Role>>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		using var app = TestApp.CreateTestApp(userRepo: UserRepo, roleRepo: RoleRepo);
		var token = TestApp.GenerateAccessToken(Guid.NewGuid(), [Role.Admin]);
		app.Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

		var response = await app.Client.PatchAsJsonAsync(
			$"/api/users/{user.UserId}",
			new UpdateUserRolesRequest(newRoles),
			TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.OK);
		var result = await response.Content.ReadFromJsonAsync<UpdateUserRolesResult>(TestContext.Current.CancellationToken);
		result.ShouldNotBeNull();
		result.UserId.ShouldBe(user.UserId);
		RoleRepo.Verify(r => r.SetRolesAsync(user.UserId, It.IsAny<IList<Role>>(), It.IsAny<CancellationToken>()), Times.Once);
	}

	[Fact]
	[Trait("AC", "M1.1IT6")]
	public async Task UpdateUserRolesFlow_NonAdminRole_Forbidden()
	{
		using var app = TestApp.CreateTestApp();
		var token = TestApp.GenerateAccessToken(Guid.NewGuid(), [Role.Teacher]);
		app.Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

		var response = await app.Client.PatchAsJsonAsync(
			$"/api/users/{Guid.NewGuid()}",
			new UpdateUserRolesRequest([Role.Teacher]),
			TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
	}

	[Fact]
	[Trait("AC", "M1IT9")]
	[Trait("AC", "M1.1IT7")]
	public async Task UpdateUserRolesFlow_SelfEdit_Returns400()
	{
		var adminId = Guid.NewGuid();
		var admin = fixture.CreateActiveUser("self@test.com");

		UserRepo
			.Setup(r => r.GetByIdAsync(adminId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(admin);

		using var app = TestApp.CreateTestApp(userRepo: UserRepo, roleRepo: RoleRepo);
		var token = TestApp.GenerateAccessToken(adminId, [Role.Admin]);
		app.Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

		var response = await app.Client.PatchAsJsonAsync(
			$"/api/users/{adminId}",
			new UpdateUserRolesRequest([Role.Admin]),
			TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
	}

	[Fact]
	[Trait("AC", "M1IT10")]
	[Trait("AC", "M1.1IT8")]
	public async Task UpdateUserRolesFlow_SeedAdmin_Returns400()
	{
		var seedAdminId = Guid.NewGuid();
		var seedAdmin = fixture.CreateActiveUser("seedadmin@test.com");

		UserRepo
			.Setup(r => r.GetByIdAsync(seedAdminId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(seedAdmin);

		using var app = TestApp.CreateTestApp(userRepo: UserRepo, roleRepo: RoleRepo, seedAdminEmail: "seedadmin@test.com");
		var token = TestApp.GenerateAccessToken(Guid.NewGuid(), [Role.Admin]);
		app.Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

		var response = await app.Client.PatchAsJsonAsync(
			$"/api/users/{seedAdminId}",
			new UpdateUserRolesRequest([Role.Teacher]),
			TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
	}

	[Fact]
	[Trait("AC", "M1.1IT5")]
	public async Task DeactivateUserFlow_AdminDeactivatesUser_Returns200()
	{
		var user = fixture.CreateActiveUser("deactivate@test.com");

		UserRepo
			.Setup(r => r.GetByIdAsync(user.UserId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(user);

		UserRepo
			.Setup(r => r.DeactivateAsync(user.UserId, It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		using var app = TestApp.CreateTestApp(userRepo: UserRepo);
		var token = TestApp.GenerateAccessToken(Guid.NewGuid(), [Role.Admin]);
		app.Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

		var response = await app.Client.DeleteAsync($"/api/users/{user.UserId}", TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.OK);
		UserRepo.Verify(r => r.DeactivateAsync(user.UserId, It.IsAny<CancellationToken>()), Times.Once);
	}

	[Fact]
	[Trait("AC", "M1.1IT5")]
	public async Task DeactivateUserFlow_UserNotFound_Returns404()
	{
		var userId = Guid.NewGuid();

		UserRepo
			.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
			.ReturnsAsync((User?)null);

		using var app = TestApp.CreateTestApp(userRepo: UserRepo);
		var token = TestApp.GenerateAccessToken(Guid.NewGuid(), [Role.Admin]);
		app.Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

		var response = await app.Client.DeleteAsync($"/api/users/{userId}", TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
	}

	[Fact]
	[Trait("AC", "M1.1IT6")]
	public async Task DeactivateUserFlow_NonAdminRole_Forbidden()
	{
		using var app = TestApp.CreateTestApp();
		var token = TestApp.GenerateAccessToken(Guid.NewGuid(), [Role.Teacher]);
		app.Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

		var response = await app.Client.DeleteAsync($"/api/users/{Guid.NewGuid()}", TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
	}

	[Fact]
	[Trait("AC", "M1.1IT9")]
	public async Task DeactivateUserFlow_SelfDeactivation_Returns400()
	{
		var adminId = Guid.NewGuid();

		using var app = TestApp.CreateTestApp(userRepo: UserRepo);
		var token = TestApp.GenerateAccessToken(adminId, [Role.Admin]);
		app.Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

		var response = await app.Client.DeleteAsync($"/api/users/{adminId}", TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
	}

	[Fact]
	[Trait("AC", "M1.1IT10")]
	public async Task DeactivateUserFlow_SeedAdmin_Returns400()
	{
		var seedAdminId = Guid.NewGuid();
		var seedAdmin = fixture.CreateActiveUser("seedadmin@test.com");

		UserRepo
			.Setup(r => r.GetByIdAsync(seedAdminId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(seedAdmin);

		using var app = TestApp.CreateTestApp(userRepo: UserRepo, seedAdminEmail: "seedadmin@test.com");
		var token = TestApp.GenerateAccessToken(Guid.NewGuid(), [Role.Admin]);
		app.Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

		var response = await app.Client.DeleteAsync($"/api/users/{seedAdminId}", TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
	}

	[Fact]
	[Trait("AC", "M1.1IT11")]
	public async Task DeleteUserFlow_AdminDeletesDeactivatedUser_Returns200()
	{
		var userId = Guid.NewGuid();
		var user = new User(userId, Email.Create("deactivated@test.com"), DateTime.UtcNow);

		UserRepo
			.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(user);

		UserRepo
			.Setup(r => r.DeleteAsync(userId, It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		using var app = TestApp.CreateTestApp(userRepo: UserRepo);
		var token = TestApp.GenerateAccessToken(Guid.NewGuid(), [Role.Admin]);
		app.Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

		var response = await app.Client.DeleteAsync($"/api/users/{userId}/permanent", TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.OK);
		UserRepo.Verify(r => r.DeleteAsync(userId, It.IsAny<CancellationToken>()), Times.Once);
	}

	[Fact]
	[Trait("AC", "M1.1IT12")]
	public async Task DeleteUserFlow_NonAdminRole_Forbidden()
	{
		using var app = TestApp.CreateTestApp();
		var token = TestApp.GenerateAccessToken(Guid.NewGuid(), [Role.Teacher]);
		app.Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

		var response = await app.Client.DeleteAsync($"/api/users/{Guid.NewGuid()}/permanent", TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
	}

	[Fact]
	[Trait("AC", "M1.1IT13")]
	public async Task DeleteUserFlow_SelfDelete_Returns400()
	{
		var adminId = Guid.NewGuid();

		using var app = TestApp.CreateTestApp(userRepo: UserRepo);
		var token = TestApp.GenerateAccessToken(adminId, [Role.Admin]);
		app.Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

		var response = await app.Client.DeleteAsync($"/api/users/{adminId}/permanent", TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
	}

	[Fact]
	[Trait("AC", "M1.1IT14")]
	public async Task DeleteUserFlow_ActiveUser_Returns400()
	{
		var user = fixture.CreateActiveUser("active@test.com");

		UserRepo
			.Setup(r => r.GetByIdAsync(user.UserId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(user);

		using var app = TestApp.CreateTestApp(userRepo: UserRepo);
		var token = TestApp.GenerateAccessToken(Guid.NewGuid(), [Role.Admin]);
		app.Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

		var response = await app.Client.DeleteAsync($"/api/users/{user.UserId}/permanent", TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
	}
}