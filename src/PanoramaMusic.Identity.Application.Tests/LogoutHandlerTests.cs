using Microsoft.Testing.Platform.Services;
using Moq;
using PanoramaMusic.Identity.Application.Commands.Auth;
using PanoramaMusic.Identity.Application.Handlers.Auth;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.ValueObjects;
using PanoramaMusic.Identity.Tests;
using PanoramaMusic.Identity.Tests.Factories;
using Xunit;

namespace PanoramaMusic.Identity.Application.Tests;

public class LogoutHandlerTests : IClassFixture<IdentityTestFixture>
{
	private readonly IdentityTestContext _context;
	private readonly LogoutHandler _handler;
	private readonly Guid _jti;
	private readonly DateTime _accessTokenExpiresAtUtc;

	public LogoutHandlerTests(IdentityTestFixture fixture)
	{
		_context = fixture.CreateContext();

		_context.Repositories.RefreshTokenRepositoryMock
			.Setup(r => r.RevokeAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		_context.Repositories.RevokedAccessTokenRepositoryMock
			.Setup(r => r.CreateAsync(It.IsAny<RevokedAccessToken>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		_jti = Guid.NewGuid();
		_accessTokenExpiresAtUtc = DateTime.UtcNow.AddMinutes(15);

		_context.Contexts.AccessTokenContextMock
			.SetupGet(c => c.Jti)
			.Returns(_jti);

		_context.Contexts.AccessTokenContextMock
			.SetupGet(c => c.ExpiresAtUtc)
			.Returns(_accessTokenExpiresAtUtc);

		_handler = _context.ServiceProvider.GetRequiredService<LogoutHandler>();
	}

	[Fact]
	[Trait("AC", "M1UC31")]
	public async Task HandleAsync_ValidToken_RevokesRefreshToken()
	{
		var rawToken = Guid.NewGuid().ToString();
		var tokenHash = RawToken.From(rawToken).Hash;
		var userId = Guid.NewGuid();

		var tokenId = Guid.NewGuid();

		_context.Repositories.RefreshTokenRepositoryMock
			.Setup(r => r.GetByTokenHashAsync(tokenHash, TestContext.Current.CancellationToken))
			.ReturnsAsync(RefreshTokenFactory.Create(tokenId, userId, tokenHash));

		await _handler.HandleAsync(new LogoutCommand(rawToken), TestContext.Current.CancellationToken);

		_context.Repositories.RefreshTokenRepositoryMock.Verify(r => r.RevokeAsync(tokenId, TestContext.Current.CancellationToken), Times.Once);
	}

	[Fact]
	[Trait("AC", "M1.4UC3")]
	public async Task HandleAsync_ValidToken_DenylistsCurrentAccessTokenByJti()
	{
		var rawToken = Guid.NewGuid().ToString();
		var tokenHash = RawToken.From(rawToken).Hash;
		var tokenId = Guid.NewGuid();

		_context.Repositories.RefreshTokenRepositoryMock
			.Setup(r => r.GetByTokenHashAsync(tokenHash, TestContext.Current.CancellationToken))
			.ReturnsAsync(RefreshTokenFactory.Create(tokenId, Guid.NewGuid(), tokenHash));

		await _handler.HandleAsync(new LogoutCommand(rawToken), TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => _context.Repositories.RevokedAccessTokenRepositoryMock.Verify(r => r.DeleteExpiredAsync(TestContext.Current.CancellationToken), Times.Once),
			() => _context.Repositories.RevokedAccessTokenRepositoryMock.Verify(
					r => r.CreateAsync(
							It.Is<RevokedAccessToken>(t => t.Jti == _jti && t.ExpiresAt == _accessTokenExpiresAtUtc),
							TestContext.Current.CancellationToken),
					Times.Once),
			() => _context.Repositories.RefreshTokenRepositoryMock.Verify(r => r.RevokeAsync(tokenId, TestContext.Current.CancellationToken), Times.Once));
	}

	[Fact]
	[Trait("AC", "M1.4UC3")]
	public async Task HandleAsync_NoRefreshTokenCookiePresent_StillDenylistsCurrentAccessToken()
	{
		await _handler.HandleAsync(new LogoutCommand(null), TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => _context.Repositories.RefreshTokenRepositoryMock.Verify(r => r.GetByTokenHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never),
			() => _context.Repositories.RevokedAccessTokenRepositoryMock.Verify(
					r => r.CreateAsync(It.Is<RevokedAccessToken>(t => t.Jti == _jti), TestContext.Current.CancellationToken),
					Times.Once));
	}

	[Fact]
	[Trait("AC", "M1.4UC3")]
	public async Task HandleAsync_AccessTokenAlreadyExpiredSoNoAuthenticatedPrincipal_StillRevokesRefreshTokenWithoutDenylisting()
	{
		_context.Contexts.AccessTokenContextMock
			.SetupGet(c => c.Jti)
			.Returns((Guid?)null);

		_context.Contexts.AccessTokenContextMock
			.SetupGet(c => c.ExpiresAtUtc)
			.Returns((DateTime?)null);

		var rawToken = Guid.NewGuid().ToString();
		var tokenHash = RawToken.From(rawToken).Hash;
		var tokenId = Guid.NewGuid();
		var token = new RefreshToken(tokenId, Guid.NewGuid(), tokenHash, DateTime.UtcNow.AddDays(7), tokenId, DateTime.UtcNow, null, null);

		_context.Repositories.RefreshTokenRepositoryMock
			.Setup(r => r.GetByTokenHashAsync(tokenHash, TestContext.Current.CancellationToken))
			.ReturnsAsync(token);

		await _handler.HandleAsync(new LogoutCommand(rawToken), TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => _context.Repositories.RefreshTokenRepositoryMock.Verify(r => r.RevokeAsync(tokenId, TestContext.Current.CancellationToken), Times.Once),
			() => _context.Repositories.RevokedAccessTokenRepositoryMock.Verify(r => r.CreateAsync(It.IsAny<RevokedAccessToken>(), It.IsAny<CancellationToken>()), Times.Never));
	}
}