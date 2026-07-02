using Moq;
using PanoramaMusic.Identity.Application.Commands.Admin;
using PanoramaMusic.Identity.Application.Handlers.Admin;
using PanoramaMusic.Identity.Application.Services.Sessions;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Tests.Application;

public class GetAllSessionsHandlerTests
{
	public GetAllSessionsHandlerTests()
	{
		RefreshRepo = new Mock<IRefreshTokenRepository>();
		UserRepo = new Mock<IUserRepository>();
		RoleRepo = new Mock<IUserRoleRepository>();

		Handler = new GetAllSessionsHandler(RefreshRepo.Object, UserRepo.Object, RoleRepo.Object, new CurrentSessionResolver(RefreshRepo.Object));
	}

	public Mock<IRefreshTokenRepository> RefreshRepo { get; }
	public Mock<IUserRepository> UserRepo { get; }
	public Mock<IUserRoleRepository> RoleRepo { get; }
	public GetAllSessionsHandler Handler { get; }

	[Fact]
	[Trait("AC", "M1.4UC8")]
	public async Task HandleAsync_SessionsAcrossMultipleUsers_ReturnsAllWithOwningUserIdentified()
	{
		var userA = new User(Guid.NewGuid(), Email.Create("a@test.com"), DateTime.UtcNow);
		var userB = new User(Guid.NewGuid(), Email.Create("b@test.com"), DateTime.UtcNow);
		var sessionA = new RefreshToken(Guid.NewGuid(), userA.UserId, "hash-a", DateTime.UtcNow.AddDays(7), Guid.NewGuid(), DateTime.UtcNow, null, null);
		var sessionB = new RefreshToken(Guid.NewGuid(), userB.UserId, "hash-b", DateTime.UtcNow.AddDays(7), Guid.NewGuid(), DateTime.UtcNow, null, null);

		RefreshRepo.Setup(r => r.GetAllActiveAsync(It.IsAny<CancellationToken>())).ReturnsAsync([sessionA, sessionB]);
		RefreshRepo.Setup(r => r.GetByTokenHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync((RefreshToken?)null);
		UserRepo.Setup(r => r.GetByIdAsync(userA.UserId, It.IsAny<CancellationToken>())).ReturnsAsync(userA);
		UserRepo.Setup(r => r.GetByIdAsync(userB.UserId, It.IsAny<CancellationToken>())).ReturnsAsync(userB);
		RoleRepo.Setup(r => r.GetRolesAsync(userA.UserId, It.IsAny<CancellationToken>())).ReturnsAsync((IList<Role>)[Role.Teacher]);
		RoleRepo.Setup(r => r.GetRolesAsync(userB.UserId, It.IsAny<CancellationToken>())).ReturnsAsync((IList<Role>)[Role.Admin]);

		var result = await Handler.HandleAsync(new GetAllSessionsCommand(null), TestContext.Current.CancellationToken);

		result.Count.ShouldBe(2);
		result.Single(s => s.TokenId == sessionA.TokenId).UserEmail.ShouldBe("a@test.com");
		result.Single(s => s.TokenId == sessionB.TokenId).UserEmail.ShouldBe("b@test.com");
	}
}