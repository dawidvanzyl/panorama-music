using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Identity.Application.Commands.Auth;
using PanoramaMusic.Identity.Application.Handlers.Auth;
using PanoramaMusic.Identity.Application.Requests.Auth;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.ValueObjects;
using PanoramaMusic.Identity.Tests;
using PanoramaMusic.Identity.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Application.Tests;

public class CompleteRegistrationHandlerTests : IClassFixture<IdentityTestFixture>
{
	private readonly IdentityTestContext _context;
	private readonly CompleteRegistrationHandler _handler;

	public CompleteRegistrationHandlerTests(IdentityTestFixture fixture)
	{
		_context = fixture.CreateContext();

		_context.Services.PasswordHashServiceMock
			.Setup(h => h.Hash(It.IsAny<string>()))
			.Returns(PasswordHash.Create("$argon2id$v=19$hashed"));

		_handler = _context.ServiceProvider.GetRequiredService<CompleteRegistrationHandler>();
	}

	[Fact]
	[Trait("AC", "M1.1UC2")]
	public async Task HandleAsync_PolicyCompliantPassword_ActivatesUser()
	{
		var rawToken = Guid.NewGuid().ToString();
		var tokenHash = RawToken.From(rawToken).Hash;
		var userId = Guid.NewGuid();

		_context.Repositories.InviteTokenRepositoryMock
			.Setup(r => r.GetByTokenHashAsync(tokenHash, It.IsAny<CancellationToken>()))
			.ReturnsAsync(InviteTokenFactory.CreateActive(userId, tokenHash));

		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(UserFactory.Create(userId));

		await _handler.HandleAsync(new CompleteRegistrationCommand(new CompleteRegistrationRequest(rawToken, "ValidPass1")), TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => _context.Repositories.UserRepositoryMock.Verify(r => r.UpdatePasswordAsync(userId, It.IsAny<string>(), false, TestContext.Current.CancellationToken), Times.Once),
			() => _context.Repositories.UserRepositoryMock.Verify(r => r.ActivateAsync(userId, TestContext.Current.CancellationToken), Times.Once));
	}

	[Fact]
	[Trait("AC", "M1UC32")]
	public async Task HandleAsync_ValidInviteToken_ActivatesUserAndMarksTokenUsed()
	{
		var rawToken = Guid.NewGuid().ToString();
		var tokenHash = RawToken.From(rawToken).Hash;
		var userId = Guid.NewGuid();

		var invite = InviteTokenFactory.CreateActive(userId, tokenHash);
		_context.Repositories.InviteTokenRepositoryMock
			.Setup(r => r.GetByTokenHashAsync(tokenHash, It.IsAny<CancellationToken>()))
			.ReturnsAsync(invite);

		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(UserFactory.Create(userId));

		await _handler.HandleAsync(new CompleteRegistrationCommand(new CompleteRegistrationRequest(rawToken, "NewPass123!")), TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => _context.Repositories.InviteTokenRepositoryMock.Verify(r => r.UseAsync(invite.TokenId, TestContext.Current.CancellationToken), Times.Once),
			() => _context.Repositories.UserRepositoryMock.Verify(r => r.UpdatePasswordAsync(userId, It.IsAny<string>(), false, TestContext.Current.CancellationToken), Times.Once),
			() => _context.Repositories.UserRepositoryMock.Verify(r => r.ActivateAsync(userId, TestContext.Current.CancellationToken), Times.Once));
	}

	[Fact]
	[Trait("AC", "M1UC33")]
	public async Task HandleAsync_ExpiredInviteToken_ThrowsUnauthorizedException()
	{
		var rawToken = Guid.NewGuid().ToString();
		var tokenHash = RawToken.From(rawToken).Hash;
		var userId = Guid.NewGuid();

		_context.Repositories.InviteTokenRepositoryMock
			.Setup(r => r.GetByTokenHashAsync(tokenHash, It.IsAny<CancellationToken>()))
			.ReturnsAsync(InviteTokenFactory.CreateExpired(userId, tokenHash));

		await Should.ThrowAsync<UnauthorizedException>(
			() => _handler.HandleAsync(new CompleteRegistrationCommand(new CompleteRegistrationRequest(rawToken, "NewPass123!")), TestContext.Current.CancellationToken));

		_context.Repositories.InviteTokenRepositoryMock.Verify(r => r.UseAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
	}

	[Fact]
	[Trait("AC", "M1UC34")]
	public async Task HandleAsync_AlreadyUsedInviteToken_ThrowsUnauthorizedException()
	{
		var rawToken = Guid.NewGuid().ToString();
		var tokenHash = RawToken.From(rawToken).Hash;
		var userId = Guid.NewGuid();

		_context.Repositories.InviteTokenRepositoryMock
			.Setup(r => r.GetByTokenHashAsync(tokenHash, It.IsAny<CancellationToken>()))
			.ReturnsAsync(InviteTokenFactory.CreateUsed(userId, tokenHash));

		await Should.ThrowAsync<UnauthorizedException>(
			() => _handler.HandleAsync(new CompleteRegistrationCommand(new CompleteRegistrationRequest(rawToken, "NewPass123!")), TestContext.Current.CancellationToken));

		_context.Repositories.InviteTokenRepositoryMock.Verify(r => r.UseAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
	}
}