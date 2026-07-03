using Moq;
using PanoramaMusic.Identity.Application.Commands.Admin;
using PanoramaMusic.Identity.Application.Handlers.Admin;
using PanoramaMusic.Identity.Application.Services.Sessions;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Domain.Interfaces;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Tests.Application;

public class GetAllSessionsHandlerTests
{
	public GetAllSessionsHandlerTests()
	{
		RefreshRepo = new Mock<IRefreshTokenRepository>();

		Handler = new GetAllSessionsHandler(RefreshRepo.Object, new CurrentSessionResolver(RefreshRepo.Object));
	}

	public Mock<IRefreshTokenRepository> RefreshRepo { get; }
	public GetAllSessionsHandler Handler { get; }

	[Fact]
	[Trait("AC", "M1.4UC8")]
	public async Task HandleAsync_SessionsAcrossMultipleUsers_ReturnsAllWithOwningUserIdentified()
	{
		var userAId = Guid.NewGuid();
		var userBId = Guid.NewGuid();
		var sessionA = new SessionWithOwner(Guid.NewGuid(), userAId, "a@test.com", [Role.Teacher], DateTime.UtcNow, DateTime.UtcNow, DateTime.UtcNow.AddDays(7), null, null);
		var sessionB = new SessionWithOwner(Guid.NewGuid(), userBId, "b@test.com", [Role.Admin], DateTime.UtcNow, DateTime.UtcNow, DateTime.UtcNow.AddDays(7), null, null);

		RefreshRepo.Setup(r => r.GetAllActiveWithOwnerAsync(It.IsAny<CancellationToken>())).ReturnsAsync([sessionA, sessionB]);
		RefreshRepo.Setup(r => r.GetByTokenHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync((RefreshToken?)null);

		var result = await Handler.HandleAsync(new GetAllSessionsCommand(null), TestContext.Current.CancellationToken);

		result.Count.ShouldBe(2);
		result.Single(s => s.TokenId == sessionA.TokenId).UserEmail.ShouldBe("a@test.com");
		result.Single(s => s.TokenId == sessionB.TokenId).UserEmail.ShouldBe("b@test.com");
	}
}