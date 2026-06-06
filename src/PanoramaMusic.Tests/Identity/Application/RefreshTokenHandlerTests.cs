using Moq;
using PanoramaMusic.Identity.Application;
using PanoramaMusic.Identity.Application.Commands.Auth;
using PanoramaMusic.Identity.Application.Handlers.Auth;
using PanoramaMusic.Identity.Application.Requests.Auth;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Tests.Identity.Application;

public class RefreshTokenHandlerTests
{
	private static (
		Mock<IRefreshTokenRepository> refreshRepo,
		Mock<IUserRepository> userRepo,
		Mock<IUserRoleRepository> roleRepo,
		Mock<IJwtService> jwt,
		RefreshTokenHandler handler) CreateSut()
	{
		var refreshRepo = new Mock<IRefreshTokenRepository>();
		var userRepo = new Mock<IUserRepository>();
		var roleRepo = new Mock<IUserRoleRepository>();
		var jwt = new Mock<IJwtService>();

		refreshRepo.Setup(r => r.RotateAsync(It.IsAny<Guid>(), It.IsAny<RefreshToken>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
		jwt.Setup(j => j.GenerateToken(It.IsAny<Guid>(), It.IsAny<IList<Role>>())).Returns(new JwtToken("new-access-token", DateTime.UtcNow));

		var handler = new RefreshTokenHandler(refreshRepo.Object, userRepo.Object, roleRepo.Object, jwt.Object);
		return (refreshRepo, userRepo, roleRepo, jwt, handler);
	}

	[Fact]
	[Trait("AC", "M1UC28")]
	public async Task HandleAsync_ValidToken_RevokesOldAndReturnsNewAuthResult()
	{
		var (refreshRepo, userRepo, roleRepo, _, handler) = CreateSut();
		var rawToken = Guid.NewGuid().ToString();
		var tokenHash = TokenHasher.ComputeSha256Hash(rawToken);
		var userId = Guid.NewGuid();

		var existing = new RefreshToken(Guid.NewGuid(), userId, tokenHash, DateTime.UtcNow.AddDays(7));
		refreshRepo.Setup(r => r.GetByTokenHashAsync(tokenHash, It.IsAny<CancellationToken>())).ReturnsAsync(existing);

		var user = new User(userId, PanoramaMusic.Identity.Domain.ValueObjects.Email.Create("u@test.com"), DateTime.UtcNow);
		user.Activate();
		userRepo.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>())).ReturnsAsync(user);
		roleRepo.Setup(r => r.GetRolesAsync(userId, It.IsAny<CancellationToken>())).ReturnsAsync([]);

		var result = await handler.HandleAsync(new RefreshTokenCommand(new RefreshTokenRequest(rawToken)), CancellationToken.None);

		result.ShouldNotBeNull();
		result.AccessToken.ShouldBe("new-access-token");
		refreshRepo.Verify(r => r.RotateAsync(existing.TokenId, It.IsAny<RefreshToken>(), It.IsAny<CancellationToken>()), Times.Once);
	}

	[Fact]
	[Trait("AC", "M1UC29")]
	public async Task HandleAsync_ExpiredToken_ThrowsUnauthorizedException()
	{
		var (refreshRepo, _, _, _, handler) = CreateSut();
		var rawToken = Guid.NewGuid().ToString();
		var tokenHash = TokenHasher.ComputeSha256Hash(rawToken);
		var userId = Guid.NewGuid();

		var expired = new RefreshToken(Guid.NewGuid(), userId, tokenHash, DateTime.UtcNow.AddDays(-1));
		refreshRepo.Setup(r => r.GetByTokenHashAsync(tokenHash, It.IsAny<CancellationToken>())).ReturnsAsync(expired);

		await Should.ThrowAsync<UnauthorizedException>(
			() => handler.HandleAsync(new RefreshTokenCommand(new RefreshTokenRequest(rawToken)), CancellationToken.None));
	}

	[Fact]
	[Trait("AC", "M1UC30")]
	public async Task HandleAsync_RevokedToken_ThrowsUnauthorizedException()
	{
		var (refreshRepo, _, _, _, handler) = CreateSut();
		var rawToken = Guid.NewGuid().ToString();
		var tokenHash = TokenHasher.ComputeSha256Hash(rawToken);
		var userId = Guid.NewGuid();

		var revoked = new RefreshToken(Guid.NewGuid(), userId, tokenHash, DateTime.UtcNow.AddDays(7));
		revoked.Revoke();
		refreshRepo.Setup(r => r.GetByTokenHashAsync(tokenHash, It.IsAny<CancellationToken>())).ReturnsAsync(revoked);

		await Should.ThrowAsync<UnauthorizedException>(
			() => handler.HandleAsync(new RefreshTokenCommand(new RefreshTokenRequest(rawToken)), CancellationToken.None));
	}
}