using Moq;
using PanoramaMusic.Identity.Application;
using PanoramaMusic.Identity.Application.Commands.Auth;
using PanoramaMusic.Identity.Application.Handlers.Auth;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Tests.Application;

public class LogoutHandlerTests
{
	public LogoutHandlerTests()
	{
		RefreshRepo = new Mock<IRefreshTokenRepository>();

		RefreshRepo
			.Setup(r => r.UpdateAsync(It.IsAny<RefreshToken>(), TestContext.Current.CancellationToken))
			.Returns(Task.CompletedTask);

		Handler = new LogoutHandler(RefreshRepo.Object);
	}
	public Mock<IRefreshTokenRepository> RefreshRepo { get; }
	public LogoutHandler Handler { get; }

	[Fact]
	[Trait("AC", "M1UC31")]
	public async Task HandleAsync_ValidToken_RevokesToken()
	{
		var rawToken = Guid.NewGuid().ToString();
		var tokenHash = RawToken.From(rawToken).Hash;
		var userId = Guid.NewGuid();

		var token = new RefreshToken(Guid.NewGuid(), userId, tokenHash, DateTime.UtcNow.AddDays(7));
		RefreshRepo
			.Setup(r => r.GetByTokenHashAsync(tokenHash, TestContext.Current.CancellationToken))
			.ReturnsAsync(token);

		await Handler.HandleAsync(new LogoutCommand(rawToken), TestContext.Current.CancellationToken);

		token.IsRevoked.ShouldBeTrue();
		RefreshRepo.Verify(r => r.UpdateAsync(token, TestContext.Current.CancellationToken), Times.Once);
	}
}