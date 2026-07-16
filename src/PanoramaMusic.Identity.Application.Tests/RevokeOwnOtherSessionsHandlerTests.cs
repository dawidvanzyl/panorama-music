using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Identity.Application.Commands.Sessions;
using PanoramaMusic.Identity.Application.Handlers.Sessions;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Tests;
using PanoramaMusic.Identity.Tests.Factories;
using Xunit;

namespace PanoramaMusic.Identity.Application.Tests;

public class RevokeOwnOtherSessionsHandlerTests : IClassFixture<IdentityTestFixture>
{
	private readonly IdentityTestContext _context;
	private readonly Guid _userId;
	private readonly RevokeOwnOtherSessionsHandler _handler;

	public RevokeOwnOtherSessionsHandlerTests(IdentityTestFixture fixture)
	{
		_context = fixture.CreateContext();

		_userId = Guid.NewGuid();
		_context.Contexts.UserContextMock
			.Setup(c => c.UserId)
			.Returns(_userId);

		_handler = _context.ServiceProvider.GetRequiredService<RevokeOwnOtherSessionsHandler>();
	}

	[Fact]
	[Trait("AC", "M1.4UC7")]
	public async Task HandleAsync_RevokesEveryOtherSessionButNeverTheCurrentOne()
	{
		var currentToken = RefreshTokenFactory.Create(Guid.NewGuid(), _userId, "current-hash");
		var accessTokenJti = Guid.NewGuid();
		var accessTokenExpiresAt = DateTime.UtcNow.AddMinutes(10);
		var otherToken = RefreshTokenFactory.Create(
			Guid.NewGuid(), _userId, "other-hash",
			accessTokenJti: accessTokenJti, accessTokenExpiresAt: accessTokenExpiresAt);

		_context.Repositories.RefreshTokenRepositoryMock.Setup(r => r.GetByTokenHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(currentToken);
		_context.Repositories.RefreshTokenRepositoryMock
			.Setup(r => r.GetActiveByUserIdAsync(_userId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([currentToken, otherToken]);
		_context.Repositories.RefreshTokenRepositoryMock
			.Setup(r => r.RevokeAllForUserExceptAsync(_userId, currentToken.TokenId, It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		await _handler.HandleAsync(
			new RevokeOwnOtherSessionsCommand("raw-current-token"),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => _context.Repositories.RevokedAccessTokenRepositoryMock.Verify(r => r.DeleteExpiredAsync(It.IsAny<CancellationToken>()), Times.Once),
			() => _context.Repositories.RevokedAccessTokenRepositoryMock.Verify(
				r => r.CreateManyAsync(
					It.Is<IReadOnlyList<RevokedAccessToken>>(list => list.Count == 1 && list[0].Jti == accessTokenJti && list[0].ExpiresAt == accessTokenExpiresAt),
					It.IsAny<CancellationToken>()),
				Times.Once),
			() => _context.Repositories.RefreshTokenRepositoryMock.Verify(
				r => r.RevokeAllForUserExceptAsync(_userId, currentToken.TokenId, It.IsAny<CancellationToken>()),
				Times.Once));
	}

	[Fact]
	[Trait("AC", "M1.4UC7")]
	public async Task HandleAsync_ExcludesSessionsWithoutALiveAccessTokenFromTheDenylistList()
	{
		var currentToken = RefreshTokenFactory.Create(Guid.NewGuid(), _userId, "current-hash");
		var sessionWithoutAccessToken = RefreshTokenFactory.Create(Guid.NewGuid(), _userId, "no-token-hash");
		var sessionWithExpiredAccessToken = RefreshTokenFactory.Create(
			Guid.NewGuid(), _userId, "expired-token-hash",
			accessTokenJti: Guid.NewGuid(), accessTokenExpiresAt: DateTime.UtcNow.AddMinutes(-1));

		_context.Repositories.RefreshTokenRepositoryMock.Setup(r => r.GetByTokenHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(currentToken);
		_context.Repositories.RefreshTokenRepositoryMock
			.Setup(r => r.GetActiveByUserIdAsync(_userId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([currentToken, sessionWithoutAccessToken, sessionWithExpiredAccessToken]);
		_context.Repositories.RefreshTokenRepositoryMock
			.Setup(r => r.RevokeAllForUserExceptAsync(_userId, currentToken.TokenId, It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		await _handler.HandleAsync(
			new RevokeOwnOtherSessionsCommand("raw-current-token"),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => _context.Repositories.RevokedAccessTokenRepositoryMock.Verify(r => r.DeleteExpiredAsync(It.IsAny<CancellationToken>()), Times.Never),
			() => _context.Repositories.RevokedAccessTokenRepositoryMock.Verify(r => r.CreateManyAsync(It.IsAny<IReadOnlyList<RevokedAccessToken>>(), It.IsAny<CancellationToken>()), Times.Never),
			() => _context.Repositories.RefreshTokenRepositoryMock.Verify(
				r => r.RevokeAllForUserExceptAsync(_userId, currentToken.TokenId, It.IsAny<CancellationToken>()),
				Times.Once));
	}
}