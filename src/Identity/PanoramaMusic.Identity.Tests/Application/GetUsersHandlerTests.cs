using Moq;
using PanoramaMusic.Identity.Application;
using PanoramaMusic.Identity.Application.Handlers.Admin;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Tests.Application;

public class GetUsersHandlerTests
{
	public GetUsersHandlerTests()
	{
		UserRepo = new Mock<IUserRepository>();
		RoleRepo = new Mock<IUserRoleRepository>();
		AdminOptions = new Mock<IAdminOptions>();

		AdminOptions.Setup(a => a.SeedAdminEmail).Returns(string.Empty);

		Handler = new GetUsersHandler(UserRepo.Object, RoleRepo.Object, AdminOptions.Object);
	}

	public Mock<IUserRepository> UserRepo { get; }
	public Mock<IUserRoleRepository> RoleRepo { get; }
	public Mock<IAdminOptions> AdminOptions { get; }
	public GetUsersHandler Handler { get; }

	[Fact]
	[Trait("AC", "M1UC48")]
	public async Task HandleAsync_WithUsers_ReturnsSummaryForEachUser()
	{
		var user1 = new User(Guid.NewGuid(), Email.Create("admin@test.com"), DateTime.UtcNow);
		var user2 = new User(Guid.NewGuid(), Email.Create("teacher@test.com"), DateTime.UtcNow);

		UserRepo
			.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
			.ReturnsAsync([user1, user2]);

		RoleRepo
			.Setup(r => r.GetRolesAsync(user1.UserId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([Role.Admin]);

		RoleRepo
			.Setup(r => r.GetRolesAsync(user2.UserId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([Role.Teacher]);

		var result = await Handler.HandleAsync(TestContext.Current.CancellationToken);

		result.Count.ShouldBe(2);
		result[0].Email.ShouldBe("admin@test.com");
		result[0].Roles.ShouldContain(Role.Admin);
		result[0].IsProtected.ShouldBeFalse();
		result[1].Email.ShouldBe("teacher@test.com");
		result[1].Roles.ShouldContain(Role.Teacher);
		result[1].IsProtected.ShouldBeFalse();
	}

	[Fact]
	[Trait("AC", "M1UC48")]
	public async Task HandleAsync_NoUsers_ReturnsEmptyList()
	{
		UserRepo
			.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
			.ReturnsAsync([]);

		var result = await Handler.HandleAsync(TestContext.Current.CancellationToken);

		result.ShouldBeEmpty();
	}
}