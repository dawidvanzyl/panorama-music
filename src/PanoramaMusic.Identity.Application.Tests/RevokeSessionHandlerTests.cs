using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Audit.Domain;
using PanoramaMusic.Identity.Application.Commands.Admin;
using PanoramaMusic.Identity.Application.Constants;
using PanoramaMusic.Identity.Application.Handlers.Admin;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Tests;
using PanoramaMusic.Identity.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Application.Tests;

public class RevokeSessionHandlerTests : IClassFixture<IdentityTestFixture>
{
	private readonly IdentityTestContext _context;
	private readonly RevokeSessionHandler _handler;

	public RevokeSessionHandlerTests(IdentityTestFixture fixture)
	{
		_context = fixture.CreateContext();

		_context.Contexts.UserContextMock
			.Setup(u => u.UserId)
			.Returns(Guid.NewGuid());

		_handler = _context.ServiceProvider.GetRequiredService<RevokeSessionHandler>();
	}

	[Fact]
	[Trait("AC", "M1.4UC9")]
	public async Task HandleAsync_ExistingSession_RevokesIt()
	{
		var session = RefreshTokenFactory.Create(Guid.NewGuid(), Guid.NewGuid(), "hash");
		_context.Repositories.RefreshTokenRepositoryMock.Setup(r => r.GetByTokenIdAsync(session.TokenId, It.IsAny<CancellationToken>())).ReturnsAsync(session);
		_context.Repositories.RefreshTokenRepositoryMock.Setup(r => r.RevokeAsync(session.TokenId, It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

		await _handler.HandleAsync(new RevokeSessionCommand(session.TokenId), TestContext.Current.CancellationToken);

		_context.Repositories.RefreshTokenRepositoryMock.Verify(r => r.RevokeAsync(session.TokenId, It.IsAny<CancellationToken>()), Times.Once);
	}

	[Fact]
	[Trait("AC", "M1.4UC9")]
	public async Task HandleAsync_SessionWithLiveAccessToken_DenylistsTheAccessToken()
	{
		var accessTokenJti = Guid.NewGuid();
		var accessTokenExpiresAt = DateTime.UtcNow.AddMinutes(10);
		var session = RefreshTokenFactory.Create(
			Guid.NewGuid(), Guid.NewGuid(), "hash",
			accessTokenJti: accessTokenJti, accessTokenExpiresAt: accessTokenExpiresAt);
		_context.Repositories.RefreshTokenRepositoryMock.Setup(r => r.GetByTokenIdAsync(session.TokenId, It.IsAny<CancellationToken>())).ReturnsAsync(session);
		_context.Repositories.RefreshTokenRepositoryMock.Setup(r => r.RevokeAsync(session.TokenId, It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

		await _handler.HandleAsync(new RevokeSessionCommand(session.TokenId), TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => _context.Repositories.RevokedAccessTokenRepositoryMock.Verify(r => r.DeleteExpiredAsync(It.IsAny<CancellationToken>()), Times.Once),
			() => _context.Repositories.RevokedAccessTokenRepositoryMock.Verify(
				r => r.CreateAsync(
					It.Is<RevokedAccessToken>(t => t.Jti == accessTokenJti && t.ExpiresAt == accessTokenExpiresAt),
					It.IsAny<CancellationToken>()),
				Times.Once),
			() => _context.Repositories.RefreshTokenRepositoryMock.Verify(r => r.RevokeAsync(session.TokenId, It.IsAny<CancellationToken>()), Times.Once));
	}

	[Fact]
	[Trait("AC", "M1.4UC9")]
	public async Task HandleAsync_UnknownSession_ThrowsEntityNotFoundException()
	{
		_context.Repositories.RefreshTokenRepositoryMock.Setup(r => r.GetByTokenIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync((RefreshToken?)null);

		await Should.ThrowAsync<EntityNotFoundException>(
			() => _handler.HandleAsync(new RevokeSessionCommand(Guid.NewGuid()), TestContext.Current.CancellationToken));
	}

	[Fact]
	[Trait("AC", "M1.5UC12")]
	public async Task HandleAsync_ExistingSession_RecordsTargetDisplayAsTheOwningUsersEmail()
	{
		var owner = UserFactory.Create(Guid.NewGuid(), "owner@test.com");
		var session = RefreshTokenFactory.Create(Guid.NewGuid(), owner.UserId, "hash");
		_context.Repositories.RefreshTokenRepositoryMock.Setup(r => r.GetByTokenIdAsync(session.TokenId, It.IsAny<CancellationToken>())).ReturnsAsync(session);
		_context.Repositories.RefreshTokenRepositoryMock.Setup(r => r.RevokeAsync(session.TokenId, It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
		_context.Repositories.UserRepositoryMock.Setup(r => r.GetByIdAsync(owner.UserId, It.IsAny<CancellationToken>())).ReturnsAsync(owner);

		await _handler.HandleAsync(new RevokeSessionCommand(session.TokenId), TestContext.Current.CancellationToken);

		_context.Audit.AuditEventFactoryMock.Verify(
			f => f.Create(
				IdentityAuditEventTypes.TokenRevoked,
				It.IsAny<Guid?>(),
				It.IsAny<string?>(),
				owner.UserId,
				AuditOutcomes.Success,
				It.IsAny<string?>(),
				It.Is<IReadOnlyDictionary<string, object?>?>(d => d != null && (string)d[AuditEventDetailKeys.TargetDisplay]! == "owner@test.com")),
			Times.Once);
	}
}