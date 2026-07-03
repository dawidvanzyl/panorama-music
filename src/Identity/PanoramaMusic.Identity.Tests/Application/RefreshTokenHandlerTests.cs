using Moq;
using PanoramaMusic.Identity.Application;
using PanoramaMusic.Identity.Application.Commands.Auth;
using PanoramaMusic.Identity.Application.Handlers.Auth;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Application.Requests.Auth;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Tests.Application;

public class RefreshTokenHandlerTests
{
	public RefreshTokenHandlerTests()
	{
		RefreshRepo = new Mock<IRefreshTokenRepository>();
		UserRepo = new Mock<IUserRepository>();
		RoleRepo = new Mock<IUserRoleRepository>();
		Jwt = new Mock<IJwtService>();
		SessionOptions = new Mock<ISessionOptions>();
		ClientContext = new Mock<IClientContext>();

		SessionOptions.SetupGet(o => o.AbsoluteSessionLifetimeDays).Returns(30);

		RefreshRepo
			.Setup(r => r.RotateAsync(It.IsAny<Guid>(), It.IsAny<RefreshToken>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		RefreshRepo
			.Setup(r => r.RevokeFamilyAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		RefreshRepo
			.Setup(r => r.UpdateAsync(It.IsAny<RefreshToken>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		Jwt
			.Setup(j => j.GenerateToken(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<IList<Role>>()))
			.Returns(new JwtToken("new-access-token", DateTime.UtcNow, Guid.NewGuid()));

		Handler = new RefreshTokenHandler(RefreshRepo.Object, UserRepo.Object, RoleRepo.Object, Jwt.Object, SessionOptions.Object, ClientContext.Object);
	}

	public Mock<IRefreshTokenRepository> RefreshRepo { get; }
	public Mock<IUserRepository> UserRepo { get; }
	public Mock<IUserRoleRepository> RoleRepo { get; }
	public Mock<IJwtService> Jwt { get; }
	public Mock<ISessionOptions> SessionOptions { get; }
	public Mock<IClientContext> ClientContext { get; }
	public RefreshTokenHandler Handler { get; }

	private static RefreshToken CreateToken(string tokenHash, Guid userId, DateTime expiresAt, DateTime? sessionStartedAt = null, Guid? familyId = null)
	{
		var tokenId = Guid.NewGuid();
		return new RefreshToken(tokenId, userId, tokenHash, expiresAt, familyId ?? tokenId, sessionStartedAt ?? DateTime.UtcNow, null, null);
	}

	[Fact]
	[Trait("AC", "M1UC28")]
	public async Task HandleAsync_ValidToken_RevokesOldAndReturnsNewAuthResult()
	{
		var rawToken = Guid.NewGuid().ToString();
		var tokenHash = RawToken.From(rawToken).Hash;
		var userId = Guid.NewGuid();

		var existing = CreateToken(tokenHash, userId, DateTime.UtcNow.AddDays(7));
		RefreshRepo
			.Setup(r => r.GetByTokenHashAsync(tokenHash, It.IsAny<CancellationToken>()))
			.ReturnsAsync(existing);

		var user = new User(userId, Email.Create("u@test.com"), DateTime.UtcNow);
		user.Activate();
		UserRepo
			.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(user);

		RoleRepo
			.Setup(r => r.GetRolesAsync(userId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([]);

		var result = await Handler.HandleAsync(new RefreshTokenCommand(new RefreshTokenRequest(rawToken)), TestContext.Current.CancellationToken);

		result.ShouldNotBeNull();
		result.AccessToken.ShouldBe("new-access-token");
		RefreshRepo.Verify(r => r.RotateAsync(existing.TokenId, It.IsAny<RefreshToken>(), TestContext.Current.CancellationToken), Times.Once);
	}

	[Fact]
	[Trait("AC", "M1UC28")]
	public async Task HandleAsync_ValidToken_RotatesIntoTokenInheritingFamilyIdAndSessionStartedAt()
	{
		var rawToken = Guid.NewGuid().ToString();
		var tokenHash = RawToken.From(rawToken).Hash;
		var userId = Guid.NewGuid();
		var sessionStartedAt = DateTime.UtcNow.AddDays(-2);

		var existing = CreateToken(tokenHash, userId, DateTime.UtcNow.AddDays(7), sessionStartedAt);
		RefreshRepo
			.Setup(r => r.GetByTokenHashAsync(tokenHash, It.IsAny<CancellationToken>()))
			.ReturnsAsync(existing);

		var user = new User(userId, Email.Create("u@test.com"), DateTime.UtcNow);
		user.Activate();
		UserRepo.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>())).ReturnsAsync(user);
		RoleRepo.Setup(r => r.GetRolesAsync(userId, It.IsAny<CancellationToken>())).ReturnsAsync([]);

		await Handler.HandleAsync(new RefreshTokenCommand(new RefreshTokenRequest(rawToken)), TestContext.Current.CancellationToken);

		RefreshRepo.Verify(r => r.RotateAsync(
			existing.TokenId,
			It.Is<RefreshToken>(t => t.FamilyId == existing.FamilyId && t.SessionStartedAt == sessionStartedAt),
			TestContext.Current.CancellationToken), Times.Once);
	}

	[Fact]
	[Trait("AC", "M1UC29")]
	public async Task HandleAsync_ExpiredToken_ThrowsUnauthorizedException()
	{
		var rawToken = Guid.NewGuid().ToString();
		var tokenHash = RawToken.From(rawToken).Hash;
		var userId = Guid.NewGuid();

		var expired = CreateToken(tokenHash, userId, DateTime.UtcNow.AddDays(-1));
		RefreshRepo
			.Setup(r => r.GetByTokenHashAsync(tokenHash, It.IsAny<CancellationToken>()))
			.ReturnsAsync(expired);

		await Should.ThrowAsync<UnauthorizedException>(
			() => Handler.HandleAsync(new RefreshTokenCommand(new RefreshTokenRequest(rawToken)), TestContext.Current.CancellationToken));
	}

	[Fact]
	[Trait("AC", "M1UC30")]
	public async Task HandleAsync_RevokedToken_ThrowsUnauthorizedException()
	{
		var rawToken = Guid.NewGuid().ToString();
		var tokenHash = RawToken.From(rawToken).Hash;
		var userId = Guid.NewGuid();

		var revoked = CreateToken(tokenHash, userId, DateTime.UtcNow.AddDays(7));
		revoked.Revoke();
		RefreshRepo.Setup(r => r.GetByTokenHashAsync(tokenHash, It.IsAny<CancellationToken>())).ReturnsAsync(revoked);

		await Should.ThrowAsync<UnauthorizedException>(
			() => Handler.HandleAsync(new RefreshTokenCommand(new RefreshTokenRequest(rawToken)), TestContext.Current.CancellationToken));
	}

	[Fact]
	[Trait("AC", "M1.4UC6")]
	public async Task HandleAsync_ReplayOfRevokedToken_RevokesEntireFamily()
	{
		var rawToken = Guid.NewGuid().ToString();
		var tokenHash = RawToken.From(rawToken).Hash;
		var userId = Guid.NewGuid();
		var familyId = Guid.NewGuid();

		var revoked = CreateToken(tokenHash, userId, DateTime.UtcNow.AddDays(7), familyId: familyId);
		revoked.Revoke();
		RefreshRepo.Setup(r => r.GetByTokenHashAsync(tokenHash, It.IsAny<CancellationToken>())).ReturnsAsync(revoked);

		await Should.ThrowAsync<UnauthorizedException>(
			() => Handler.HandleAsync(new RefreshTokenCommand(new RefreshTokenRequest(rawToken)), TestContext.Current.CancellationToken));

		RefreshRepo.Verify(r => r.RevokeFamilyAsync(familyId, TestContext.Current.CancellationToken), Times.Once);
	}

	[Fact]
	[Trait("AC", "M1.4UC5")]
	public async Task HandleAsync_SessionOlderThanAbsoluteLifetime_ThrowsUnauthorizedAndRevokesToken()
	{
		var rawToken = Guid.NewGuid().ToString();
		var tokenHash = RawToken.From(rawToken).Hash;
		var userId = Guid.NewGuid();

		var staleSession = CreateToken(tokenHash, userId, DateTime.UtcNow.AddDays(7), DateTime.UtcNow.AddDays(-31));
		RefreshRepo.Setup(r => r.GetByTokenHashAsync(tokenHash, It.IsAny<CancellationToken>())).ReturnsAsync(staleSession);

		await Should.ThrowAsync<UnauthorizedException>(
			() => Handler.HandleAsync(new RefreshTokenCommand(new RefreshTokenRequest(rawToken)), TestContext.Current.CancellationToken));

		staleSession.IsRevoked.ShouldBeTrue();
		RefreshRepo.Verify(r => r.UpdateAsync(staleSession, TestContext.Current.CancellationToken), Times.Once);
	}
}