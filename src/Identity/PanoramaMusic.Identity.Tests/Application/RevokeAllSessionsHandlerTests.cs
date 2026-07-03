using Moq;
using PanoramaMusic.Identity.Application.Commands.Admin;
using PanoramaMusic.Identity.Application.Handlers.Admin;
using PanoramaMusic.Identity.Application.Services.Sessions;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Interfaces;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Tests.Application;

public class RevokeAllSessionsHandlerTests
{
	public RevokeAllSessionsHandlerTests()
	{
		RefreshRepo = new Mock<IRefreshTokenRepository>();
		Handler = new RevokeAllSessionsHandler(RefreshRepo.Object, new CurrentSessionResolver(RefreshRepo.Object));
	}

	public Mock<IRefreshTokenRepository> RefreshRepo { get; }
	public RevokeAllSessionsHandler Handler { get; }

	[Fact]
	[Trait("AC", "M1.4UC9")]
	public async Task HandleAsync_RevokesEverySessionExceptTheAdminsOwnCurrentOne()
	{
		var adminCurrentToken = new RefreshToken(Guid.NewGuid(), Guid.NewGuid(), "admin-hash", DateTime.UtcNow.AddDays(7), Guid.NewGuid(), DateTime.UtcNow, null, null);

		RefreshRepo.Setup(r => r.GetByTokenHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(adminCurrentToken);
		RefreshRepo.Setup(r => r.RevokeAllExceptAsync(adminCurrentToken.TokenId, It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

		await Handler.HandleAsync(new RevokeAllSessionsCommand("raw-admin-token"), TestContext.Current.CancellationToken);

		RefreshRepo.Verify(r => r.RevokeAllExceptAsync(adminCurrentToken.TokenId, It.IsAny<CancellationToken>()), Times.Once);
	}
}