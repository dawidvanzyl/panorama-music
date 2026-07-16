using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Identity.Application.Enums;
using PanoramaMusic.Identity.Application.Services.Auth;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Tests;
using PanoramaMusic.Identity.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Application.Tests.Services;

public class AccessTokenValidationServiceTests : IClassFixture<IdentityTestFixture>
{
	private readonly IdentityTestContext _context;
	private readonly AccessTokenValidationService _accessTokenValidationService;

	public AccessTokenValidationServiceTests(IdentityTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_accessTokenValidationService = _context.ServiceProvider.GetRequiredService<AccessTokenValidationService>();
	}

	[Fact]
	[Trait("AC", "M1.4UC3")]
	public async Task ValidateAsync_WhenJtiIsDenylisted_ReturnsRevoked()
	{
		var jti = Guid.NewGuid();
		var userId = Guid.NewGuid();

		_context.Repositories.RevokedAccessTokenRepositoryMock
			.Setup(r => r.ExistsAsync(jti, It.IsAny<CancellationToken>()))
			.ReturnsAsync(true);

		var result = await _accessTokenValidationService.ValidateAsync(jti, userId, TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.ShouldBe(AccessTokenState.Revoked),
			() => _context.Repositories.UserRepositoryMock.Verify(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never));
	}

	[Fact]
	[Trait("AC", "M1.4UC4")]
	public async Task ValidateAsync_WhenUserIsInactive_ReturnsUserInactive()
	{
		var jti = Guid.NewGuid();
		var userId = Guid.NewGuid();

		_context.Repositories.RevokedAccessTokenRepositoryMock
			.Setup(r => r.ExistsAsync(jti, It.IsAny<CancellationToken>()))
			.ReturnsAsync(false);

		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(UserFactory.Create(userId));

		var result = await _accessTokenValidationService.ValidateAsync(jti, userId, TestContext.Current.CancellationToken);

		result.ShouldBe(AccessTokenState.UserInactive);
	}

	[Fact]
	[Trait("AC", "M1.4UC4")]
	public async Task ValidateAsync_WhenUserNoLongerExists_ReturnsUserInactive()
	{
		var jti = Guid.NewGuid();
		var userId = Guid.NewGuid();

		_context.Repositories.RevokedAccessTokenRepositoryMock
			.Setup(r => r.ExistsAsync(jti, It.IsAny<CancellationToken>()))
			.ReturnsAsync(false);

		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
			.ReturnsAsync((User?)null);

		var result = await _accessTokenValidationService.ValidateAsync(jti, userId, TestContext.Current.CancellationToken);

		result.ShouldBe(AccessTokenState.UserInactive);
	}

	[Fact]
	[Trait("AC", "M1.4UC7")]
	public async Task ValidateAsync_WhenJtiNotRevokedAndUserActive_ReturnsValid()
	{
		var jti = Guid.NewGuid();
		var userId = Guid.NewGuid();

		_context.Repositories.RevokedAccessTokenRepositoryMock
			.Setup(r => r.ExistsAsync(jti, It.IsAny<CancellationToken>()))
			.ReturnsAsync(false);

		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(UserFactory.CreateActive(userId));

		var result = await _accessTokenValidationService.ValidateAsync(jti, userId, TestContext.Current.CancellationToken);

		result.ShouldBe(AccessTokenState.Valid);
	}
}