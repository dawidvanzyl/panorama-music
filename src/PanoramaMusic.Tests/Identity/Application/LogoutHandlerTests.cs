using Moq;
using PanoramaMusic.Identity.Application;
using PanoramaMusic.Identity.Application.Commands.Auth;
using PanoramaMusic.Identity.Application.Handlers.Auth;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Interfaces;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Tests.Identity.Application;

public class LogoutHandlerTests
{
	private static (Mock<IRefreshTokenRepository> refreshRepo, LogoutHandler handler) CreateSut()
	{
		var refreshRepo = new Mock<IRefreshTokenRepository>();
		refreshRepo.Setup(r => r.UpdateAsync(It.IsAny<RefreshToken>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
		return (refreshRepo, new LogoutHandler(refreshRepo.Object));
	}

	[Fact]
	[Trait("AC", "M1UC31")]
	public async Task HandleAsync_ValidToken_RevokesToken()
	{
		var (refreshRepo, handler) = CreateSut();
		var rawToken = Guid.NewGuid().ToString();
		var tokenHash = TokenHasher.ComputeSha256Hash(rawToken);
		var userId = Guid.NewGuid();

		var token = new RefreshToken(Guid.NewGuid(), userId, tokenHash, DateTime.UtcNow.AddDays(7));
		refreshRepo.Setup(r => r.GetByTokenHashAsync(tokenHash, It.IsAny<CancellationToken>())).ReturnsAsync(token);

		await handler.HandleAsync(new LogoutCommand(rawToken), CancellationToken.None);

		token.IsRevoked.ShouldBeTrue();
		refreshRepo.Verify(r => r.UpdateAsync(token, It.IsAny<CancellationToken>()), Times.Once);
	}
}