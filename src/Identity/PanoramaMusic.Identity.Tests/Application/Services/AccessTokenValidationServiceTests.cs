using Moq;
using PanoramaMusic.Identity.Application.Enums;
using PanoramaMusic.Identity.Application.Services.Auth;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Tests.Application.Services;

public class AccessTokenValidationServiceTests
{
	public AccessTokenValidationServiceTests()
	{
		RevokedAccessTokenRepo = new Mock<IRevokedAccessTokenRepository>();
		UserRepo = new Mock<IUserRepository>();
		Service = new AccessTokenValidationService(RevokedAccessTokenRepo.Object, UserRepo.Object);
	}

	public Mock<IRevokedAccessTokenRepository> RevokedAccessTokenRepo { get; }
	public Mock<IUserRepository> UserRepo { get; }
	public AccessTokenValidationService Service { get; }

	private static User CreateActiveUser(Guid userId)
	{
		var user = new User(userId, Email.Create("u@test.com"), DateTime.UtcNow);
		user.Activate();
		return user;
	}

	[Fact]
	[Trait("AC", "M1.4UC3")]
	public async Task ValidateAsync_WhenJtiIsDenylisted_ReturnsRevoked()
	{
		var jti = Guid.NewGuid();
		var userId = Guid.NewGuid();
		RevokedAccessTokenRepo.Setup(r => r.ExistsAsync(jti, It.IsAny<CancellationToken>())).ReturnsAsync(true);

		var result = await Service.ValidateAsync(jti, userId, TestContext.Current.CancellationToken);

		result.ShouldBe(AccessTokenState.Revoked);
		UserRepo.Verify(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
	}

	[Fact]
	[Trait("AC", "M1.4UC4")]
	public async Task ValidateAsync_WhenUserIsInactive_ReturnsUserInactive()
	{
		var jti = Guid.NewGuid();
		var userId = Guid.NewGuid();
		RevokedAccessTokenRepo.Setup(r => r.ExistsAsync(jti, It.IsAny<CancellationToken>())).ReturnsAsync(false);
		UserRepo.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>())).ReturnsAsync(new User(userId, Email.Create("u@test.com"), DateTime.UtcNow));

		var result = await Service.ValidateAsync(jti, userId, TestContext.Current.CancellationToken);

		result.ShouldBe(AccessTokenState.UserInactive);
	}

	[Fact]
	[Trait("AC", "M1.4UC4")]
	public async Task ValidateAsync_WhenUserNoLongerExists_ReturnsUserInactive()
	{
		var jti = Guid.NewGuid();
		var userId = Guid.NewGuid();
		RevokedAccessTokenRepo.Setup(r => r.ExistsAsync(jti, It.IsAny<CancellationToken>())).ReturnsAsync(false);
		UserRepo.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);

		var result = await Service.ValidateAsync(jti, userId, TestContext.Current.CancellationToken);

		result.ShouldBe(AccessTokenState.UserInactive);
	}

	[Fact]
	[Trait("AC", "M1.4UC7")]
	public async Task ValidateAsync_WhenJtiNotRevokedAndUserActive_ReturnsValid()
	{
		var jti = Guid.NewGuid();
		var userId = Guid.NewGuid();
		RevokedAccessTokenRepo.Setup(r => r.ExistsAsync(jti, It.IsAny<CancellationToken>())).ReturnsAsync(false);
		UserRepo.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>())).ReturnsAsync(CreateActiveUser(userId));

		var result = await Service.ValidateAsync(jti, userId, TestContext.Current.CancellationToken);

		result.ShouldBe(AccessTokenState.Valid);
	}
}