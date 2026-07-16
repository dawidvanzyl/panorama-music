using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Identity.Application.Commands.Admin;
using PanoramaMusic.Identity.Application.Handlers.Admin;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Tests;
using PanoramaMusic.Identity.Tests.Factories;
using Xunit;

namespace PanoramaMusic.Identity.Application.Tests;

public class RevokeAllSessionsHandlerTests : IClassFixture<IdentityTestFixture>
{
	private readonly IdentityTestContext _context;
	private readonly RevokeAllSessionsHandler _handler;

	public RevokeAllSessionsHandlerTests(IdentityTestFixture fixture)
	{
		_context = fixture.CreateContext();

		_context.Contexts.UserContextMock
			.Setup(u => u.UserId)
			.Returns(Guid.NewGuid());

		_handler = _context.ServiceProvider.GetRequiredService<RevokeAllSessionsHandler>();
	}

	[Fact]
	[Trait("AC", "M1.4UC9")]
	public async Task HandleAsync_RevokesEverySessionExceptTheAdminsOwnCurrentOne()
	{
		var adminCurrentToken = RefreshTokenFactory.Create(Guid.NewGuid(), Guid.NewGuid(), "admin-hash");
		var accessTokenJti = Guid.NewGuid();
		var accessTokenExpiresAt = DateTime.UtcNow.AddMinutes(10);
		var otherUserToken = RefreshTokenFactory.Create(
			Guid.NewGuid(), Guid.NewGuid(), "other-hash",
			accessTokenJti: accessTokenJti, accessTokenExpiresAt: accessTokenExpiresAt);

		_context.Repositories.RefreshTokenRepositoryMock.Setup(r => r.GetByTokenHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(adminCurrentToken);
		_context.Repositories.RefreshTokenRepositoryMock.Setup(r => r.GetAllActiveAsync(It.IsAny<CancellationToken>())).ReturnsAsync([adminCurrentToken, otherUserToken]);
		_context.Repositories.RefreshTokenRepositoryMock
			.Setup(r => r.RevokeAllExceptAsync(adminCurrentToken.TokenId, It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		await _handler.HandleAsync(new RevokeAllSessionsCommand("raw-admin-token"), TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => _context.Repositories.RevokedAccessTokenRepositoryMock.Verify(r => r.DeleteExpiredAsync(It.IsAny<CancellationToken>()), Times.Once),
			() => _context.Repositories.RevokedAccessTokenRepositoryMock.Verify(
				r => r.CreateManyAsync(
					It.Is<IReadOnlyList<RevokedAccessToken>>(list => list.Count == 1 && list[0].Jti == accessTokenJti && list[0].ExpiresAt == accessTokenExpiresAt),
					It.IsAny<CancellationToken>()),
				Times.Once),
			() => _context.Repositories.RefreshTokenRepositoryMock.Verify(r => r.RevokeAllExceptAsync(adminCurrentToken.TokenId, It.IsAny<CancellationToken>()), Times.Once));
	}

	[Fact]
	[Trait("AC", "M1.4UC9")]
	public async Task HandleAsync_ExcludesSessionsWithoutALiveAccessTokenFromTheDenylistList()
	{
		var adminCurrentToken = RefreshTokenFactory.Create(Guid.NewGuid(), Guid.NewGuid(), "admin-hash");
		var sessionWithoutAccessToken = RefreshTokenFactory.Create(Guid.NewGuid(), Guid.NewGuid(), "no-token-hash");
		var sessionWithExpiredAccessToken = RefreshTokenFactory.Create(
			Guid.NewGuid(), Guid.NewGuid(), "expired-token-hash",
			accessTokenJti: Guid.NewGuid(), accessTokenExpiresAt: DateTime.UtcNow.AddMinutes(-1));

		_context.Repositories.RefreshTokenRepositoryMock.Setup(r => r.GetByTokenHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(adminCurrentToken);
		_context.Repositories.RefreshTokenRepositoryMock
			.Setup(r => r.GetAllActiveAsync(It.IsAny<CancellationToken>()))
			.ReturnsAsync([adminCurrentToken, sessionWithoutAccessToken, sessionWithExpiredAccessToken]);
		_context.Repositories.RefreshTokenRepositoryMock
			.Setup(r => r.RevokeAllExceptAsync(adminCurrentToken.TokenId, It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		await _handler.HandleAsync(new RevokeAllSessionsCommand("raw-admin-token"), TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => _context.Repositories.RevokedAccessTokenRepositoryMock.Verify(r => r.DeleteExpiredAsync(It.IsAny<CancellationToken>()), Times.Never),
			() => _context.Repositories.RevokedAccessTokenRepositoryMock.Verify(r => r.CreateManyAsync(It.IsAny<IReadOnlyList<RevokedAccessToken>>(), It.IsAny<CancellationToken>()), Times.Never),
			() => _context.Repositories.RefreshTokenRepositoryMock.Verify(r => r.RevokeAllExceptAsync(adminCurrentToken.TokenId, It.IsAny<CancellationToken>()), Times.Once));
	}
}