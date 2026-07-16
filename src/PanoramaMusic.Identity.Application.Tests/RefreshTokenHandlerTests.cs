using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Identity.Application.Commands.Auth;
using PanoramaMusic.Identity.Application.Handlers.Auth;
using PanoramaMusic.Identity.Application.Requests.Auth;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.ValueObjects;
using PanoramaMusic.Identity.Tests;
using PanoramaMusic.Identity.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Application.Tests;

public class RefreshTokenHandlerTests : IClassFixture<IdentityTestFixture>
{
	private readonly IdentityTestContext _context;
	private readonly RefreshTokenHandler _handler;

	public RefreshTokenHandlerTests(IdentityTestFixture fixture)
	{
		_context = fixture.CreateContext();

		_context.Options.SessionOptionsMock
			.SetupGet(o => o.AbsoluteSessionLifetimeDays)
			.Returns(30);

		// Run the isolated work inline so repository verifications still observe
		// the calls made inside the isolated block.
		_context.Repositories.UnitOfWorkMock
			.Setup(u => u.ExecuteIsolatedAsync(It.IsAny<Func<Task>>(), It.IsAny<CancellationToken>()))
			.Returns<Func<Task>, CancellationToken>((work, _) => work());

		_context.Repositories.RefreshTokenRepositoryMock
			.Setup(r => r.CreateAsync(It.IsAny<RefreshToken>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		_context.Repositories.RefreshTokenRepositoryMock
			.Setup(r => r.RevokeAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		_context.Repositories.RefreshTokenRepositoryMock
			.Setup(r => r.RevokeFamilyAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		_context.Services.JwtServiceMock
			.Setup(j => j.GenerateToken(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<IList<Role>>()))
			.Returns(new JwtToken("new-access-token", DateTime.UtcNow, Guid.NewGuid()));

		_handler = _context.ServiceProvider.GetRequiredService<RefreshTokenHandler>();
	}

	[Fact]
	[Trait("AC", "M1UC28")]
	public async Task HandleAsync_ValidToken_RevokesOldAndReturnsNewAuthResult()
	{
		var tokenId = Guid.NewGuid();
		var rawToken = Guid.NewGuid().ToString();
		var tokenHash = RawToken.From(rawToken).Hash;
		var userId = Guid.NewGuid();

		_context.Repositories.RefreshTokenRepositoryMock
			.Setup(r => r.GetByTokenHashAsync(tokenHash, It.IsAny<CancellationToken>()))
			.ReturnsAsync(RefreshTokenFactory.Create(tokenId, userId, tokenHash, DateTime.UtcNow.AddDays(7)));

		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(UserFactory.CreateActive(userId));

		_context.Repositories.UserRoleRepositoryMock
			.Setup(r => r.GetRolesAsync(userId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([]);

		var result = await _handler.HandleAsync(new RefreshTokenCommand(new RefreshTokenRequest(rawToken)), TestContext.Current.CancellationToken);

		result.ShouldNotBeNull();
		ShouldlyHelpers.Satisfy(
			() => result.AccessToken.ShouldBe("new-access-token"),
			() => _context.Repositories.RefreshTokenRepositoryMock.Verify(r => r.RevokeAsync(tokenId, TestContext.Current.CancellationToken), Times.Once),
			() => _context.Repositories.RefreshTokenRepositoryMock.Verify(r => r.CreateAsync(It.IsAny<RefreshToken>(), TestContext.Current.CancellationToken), Times.Once));
	}

	[Fact]
	[Trait("AC", "M1UC28")]
	public async Task HandleAsync_ValidToken_RotatesIntoTokenInheritingFamilyIdAndSessionStartedAt()
	{
		var rawToken = Guid.NewGuid().ToString();
		var tokenId = Guid.NewGuid();
		var familyId = Guid.NewGuid();
		var tokenHash = RawToken.From(rawToken).Hash;
		var userId = Guid.NewGuid();
		var sessionStartedAt = DateTime.UtcNow.AddDays(-2);

		_context.Repositories.RefreshTokenRepositoryMock
			.Setup(r => r.GetByTokenHashAsync(tokenHash, It.IsAny<CancellationToken>()))
			.ReturnsAsync(RefreshTokenFactory.Create(tokenId, userId, tokenHash, sessionStartedAt: sessionStartedAt, familyId: familyId));

		var user = new User(userId, Email.Create("u@test.com"), DateTime.UtcNow);
		user.Activate();
		_context.Repositories.UserRepositoryMock.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>())).ReturnsAsync(user);
		_context.Repositories.UserRoleRepositoryMock.Setup(r => r.GetRolesAsync(userId, It.IsAny<CancellationToken>())).ReturnsAsync([]);

		await _handler.HandleAsync(new RefreshTokenCommand(new RefreshTokenRequest(rawToken)), TestContext.Current.CancellationToken);

		_context.Repositories.RefreshTokenRepositoryMock.Verify(r => r.RevokeAsync(tokenId, TestContext.Current.CancellationToken), Times.Once);
		_context.Repositories.RefreshTokenRepositoryMock.Verify(r => r.CreateAsync(It.Is<RefreshToken>(t => t.FamilyId == familyId && t.SessionStartedAt == sessionStartedAt), TestContext.Current.CancellationToken), Times.Once);
	}

	[Fact]
	[Trait("AC", "M1UC29")]
	public async Task HandleAsync_ExpiredToken_ThrowsUnauthorizedException()
	{
		var rawToken = Guid.NewGuid().ToString();
		var tokenId = Guid.NewGuid();
		var tokenHash = RawToken.From(rawToken).Hash;
		var userId = Guid.NewGuid();

		_context.Repositories.RefreshTokenRepositoryMock
			.Setup(r => r.GetByTokenHashAsync(tokenHash, It.IsAny<CancellationToken>()))
			.ReturnsAsync(RefreshTokenFactory.Create(tokenId, userId, tokenHash, DateTime.UtcNow.AddDays(-1)));

		await Should.ThrowAsync<UnauthorizedException>(
			() => _handler.HandleAsync(new RefreshTokenCommand(new RefreshTokenRequest(rawToken)), TestContext.Current.CancellationToken));
	}

	[Fact]
	[Trait("AC", "M1UC30")]
	public async Task HandleAsync_RevokedToken_ThrowsUnauthorizedException()
	{
		var rawToken = Guid.NewGuid().ToString();
		var tokenHash = RawToken.From(rawToken).Hash;
		var userId = Guid.NewGuid();

		_context.Repositories.RefreshTokenRepositoryMock
			.Setup(r => r.GetByTokenHashAsync(tokenHash, It.IsAny<CancellationToken>()))
			.ReturnsAsync(RefreshTokenFactory.CreateRevoked(Guid.NewGuid(), userId, tokenHash));

		await Should.ThrowAsync<UnauthorizedException>(
			() => _handler.HandleAsync(new RefreshTokenCommand(new RefreshTokenRequest(rawToken)), TestContext.Current.CancellationToken));
	}

	[Fact]
	[Trait("AC", "M1.4UC6")]
	public async Task HandleAsync_ReplayOfRevokedToken_RevokesEntireFamily()
	{
		var rawToken = Guid.NewGuid().ToString();
		var tokenHash = RawToken.From(rawToken).Hash;
		var userId = Guid.NewGuid();
		var familyId = Guid.NewGuid();

		_context.Repositories.RefreshTokenRepositoryMock
			.Setup(r => r.GetByTokenHashAsync(tokenHash, It.IsAny<CancellationToken>()))
			.ReturnsAsync(RefreshTokenFactory.CreateRevoked(Guid.NewGuid(), userId, tokenHash, familyId: familyId));

		await Should.ThrowAsync<UnauthorizedException>(
			() => _handler.HandleAsync(new RefreshTokenCommand(new RefreshTokenRequest(rawToken)), TestContext.Current.CancellationToken));

		ShouldlyHelpers.Satisfy(
			() => _context.Repositories.RefreshTokenRepositoryMock.Verify(r => r.RevokeFamilyAsync(familyId, TestContext.Current.CancellationToken), Times.Once),
			() => _context.Repositories.UnitOfWorkMock.Verify(u => u.ExecuteIsolatedAsync(It.IsAny<Func<Task>>(), TestContext.Current.CancellationToken), Times.Once));
	}

	[Fact]
	[Trait("AC", "M1.4UC5")]
	public async Task HandleAsync_SessionOlderThanAbsoluteLifetime_ThrowsUnauthorizedAndRevokesToken()
	{
		var rawToken = Guid.NewGuid().ToString();
		var tokenId = Guid.NewGuid();
		var tokenHash = RawToken.From(rawToken).Hash;
		var userId = Guid.NewGuid();

		_context.Repositories.RefreshTokenRepositoryMock
			.Setup(r => r.GetByTokenHashAsync(tokenHash, It.IsAny<CancellationToken>()))
			.ReturnsAsync(RefreshTokenFactory.Create(tokenId, userId, tokenHash, DateTime.UtcNow.AddDays(7), DateTime.UtcNow.AddDays(-31)));

		await Should.ThrowAsync<UnauthorizedException>(
			() => _handler.HandleAsync(new RefreshTokenCommand(new RefreshTokenRequest(rawToken)), TestContext.Current.CancellationToken));

		ShouldlyHelpers.Satisfy(
			() => _context.Repositories.RefreshTokenRepositoryMock.Verify(r => r.RevokeAsync(tokenId, TestContext.Current.CancellationToken), Times.Once),
			() => _context.Repositories.UnitOfWorkMock.Verify(u => u.ExecuteIsolatedAsync(It.IsAny<Func<Task>>(), TestContext.Current.CancellationToken), Times.Once));
	}
}