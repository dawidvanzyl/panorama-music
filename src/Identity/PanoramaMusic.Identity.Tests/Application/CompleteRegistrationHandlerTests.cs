using Moq;
using PanoramaMusic.Identity.Application.Commands.Auth;
using PanoramaMusic.Identity.Application.Handlers.Auth;
using PanoramaMusic.Identity.Application.Requests.Auth;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Tests.Application;

public class CompleteRegistrationHandlerTests
{
	public CompleteRegistrationHandlerTests()
	{
		InviteRepo = new Mock<IInviteTokenRepository>();
		UserRepo = new Mock<IUserRepository>();
		Hasher = new Mock<IPasswordHashService>();

		Hasher
			.Setup(h => h.Hash(It.IsAny<string>()))
			.Returns(PasswordHash.Create("$argon2id$v=19$hashed"));

		Handler = new CompleteRegistrationHandler(InviteRepo.Object, UserRepo.Object, Hasher.Object);
	}

	public Mock<IInviteTokenRepository> InviteRepo { get; }
	public Mock<IUserRepository> UserRepo { get; }
	public Mock<IPasswordHashService> Hasher { get; }
	public CompleteRegistrationHandler Handler { get; }

	[Fact]
	[Trait("AC", "M1.1UC2")]
	public async Task HandleAsync_PolicyCompliantPassword_ActivatesUser()
	{
		var rawToken = Guid.NewGuid().ToString();
		var tokenHash = RawToken.From(rawToken).Hash;
		var userId = Guid.NewGuid();

		var invite = new InviteToken(Guid.NewGuid(), userId, tokenHash, DateTime.UtcNow.AddDays(7));
		InviteRepo
			.Setup(r => r.GetByTokenHashAsync(tokenHash, It.IsAny<CancellationToken>()))
			.ReturnsAsync(invite);

		var user = new User(userId, Email.Create("u@test.com"), DateTime.UtcNow);
		UserRepo
			.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(user);

		await Handler.HandleAsync(new CompleteRegistrationCommand(new CompleteRegistrationRequest(rawToken, "ValidPass1")), TestContext.Current.CancellationToken);

		UserRepo.Verify(r => r.UpdatePasswordAsync(userId, It.IsAny<string>(), false, TestContext.Current.CancellationToken), Times.Once);
		UserRepo.Verify(r => r.ActivateAsync(userId, TestContext.Current.CancellationToken), Times.Once);
	}

	[Fact]
	[Trait("AC", "M1UC32")]
	public async Task HandleAsync_ValidInviteToken_ActivatesUserAndMarksTokenUsed()
	{
		var rawToken = Guid.NewGuid().ToString();
		var tokenHash = RawToken.From(rawToken).Hash;
		var userId = Guid.NewGuid();

		var invite = new InviteToken(Guid.NewGuid(), userId, tokenHash, DateTime.UtcNow.AddDays(7));
		InviteRepo
			.Setup(r => r.GetByTokenHashAsync(tokenHash, It.IsAny<CancellationToken>()))
			.ReturnsAsync(invite);

		var user = new User(userId, Email.Create("u@test.com"), DateTime.UtcNow);
		UserRepo
			.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(user);

		await Handler.HandleAsync(new CompleteRegistrationCommand(new CompleteRegistrationRequest(rawToken, "NewPass123!")), TestContext.Current.CancellationToken);

		InviteRepo.Verify(r => r.UseAsync(invite.TokenId, TestContext.Current.CancellationToken), Times.Once);
		UserRepo.Verify(r => r.UpdatePasswordAsync(userId, It.IsAny<string>(), false, TestContext.Current.CancellationToken), Times.Once);
		UserRepo.Verify(r => r.ActivateAsync(userId, TestContext.Current.CancellationToken), Times.Once);
	}

	[Fact]
	[Trait("AC", "M1UC33")]
	public async Task HandleAsync_ExpiredInviteToken_ThrowsUnauthorizedException()
	{
		var rawToken = Guid.NewGuid().ToString();
		var tokenHash = RawToken.From(rawToken).Hash;
		var userId = Guid.NewGuid();

		var expired = new InviteToken(Guid.NewGuid(), userId, tokenHash, DateTime.UtcNow.AddDays(-1));
		InviteRepo
			.Setup(r => r.GetByTokenHashAsync(tokenHash, It.IsAny<CancellationToken>()))
			.ReturnsAsync(expired);

		await Should.ThrowAsync<UnauthorizedException>(
			() => Handler.HandleAsync(new CompleteRegistrationCommand(new CompleteRegistrationRequest(rawToken, "NewPass123!")), TestContext.Current.CancellationToken));

		InviteRepo.Verify(r => r.UseAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
	}

	[Fact]
	[Trait("AC", "M1UC34")]
	public async Task HandleAsync_AlreadyUsedInviteToken_ThrowsUnauthorizedException()
	{
		var rawToken = Guid.NewGuid().ToString();
		var tokenHash = RawToken.From(rawToken).Hash;
		var userId = Guid.NewGuid();

		var used = new InviteToken(Guid.NewGuid(), userId, tokenHash, DateTime.UtcNow.AddDays(7));
		used.MarkUsed();
		InviteRepo
			.Setup(r => r.GetByTokenHashAsync(tokenHash, It.IsAny<CancellationToken>()))
			.ReturnsAsync(used);

		await Should.ThrowAsync<UnauthorizedException>(
			() => Handler.HandleAsync(new CompleteRegistrationCommand(new CompleteRegistrationRequest(rawToken, "NewPass123!")), TestContext.Current.CancellationToken));

		InviteRepo.Verify(r => r.UseAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
	}
}