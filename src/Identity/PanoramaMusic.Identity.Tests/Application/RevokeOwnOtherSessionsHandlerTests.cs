using Moq;
using PanoramaMusic.Identity.Application.Commands.Sessions;
using PanoramaMusic.Identity.Application.Handlers.Sessions;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Application.Services.Sessions;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Interfaces;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Tests.Application;

public class RevokeOwnOtherSessionsHandlerTests
{
	public RevokeOwnOtherSessionsHandlerTests()
	{
		RefreshRepo = new Mock<IRefreshTokenRepository>();
		UserContext = new Mock<IUserContext>();

		UserId = Guid.NewGuid();
		UserContext.SetupGet(c => c.UserId).Returns(UserId);

		Handler = new RevokeOwnOtherSessionsHandler(RefreshRepo.Object, UserContext.Object, new CurrentSessionResolver(RefreshRepo.Object));
	}

	public Mock<IRefreshTokenRepository> RefreshRepo { get; }
	public Mock<IUserContext> UserContext { get; }
	public Guid UserId { get; }
	public RevokeOwnOtherSessionsHandler Handler { get; }

	[Fact]
	[Trait("AC", "M1.4UC7")]
	public async Task HandleAsync_RevokesEveryOtherSessionButNeverTheCurrentOne()
	{
		var currentToken = new RefreshToken(Guid.NewGuid(), UserId, "current-hash", DateTime.UtcNow.AddDays(7), Guid.NewGuid(), DateTime.UtcNow, null, null);

		RefreshRepo.Setup(r => r.GetByTokenHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(currentToken);
		RefreshRepo
			.Setup(r => r.RevokeAllForUserExceptAsync(UserId, currentToken.TokenId, It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		await Handler.HandleAsync(
			new RevokeOwnOtherSessionsCommand("raw-current-token"),
			TestContext.Current.CancellationToken);

		RefreshRepo.Verify(r => r.RevokeAllForUserExceptAsync(UserId, currentToken.TokenId, It.IsAny<CancellationToken>()), Times.Once);
	}
}