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

public class ResetPasswordHandlerTests
{
	private static readonly string _validPassword = "NewPass123!";

	public ResetPasswordHandlerTests()
	{
		ResetTokenRepo = new Mock<IPasswordResetTokenRepository>();
		UserRepo = new Mock<IUserRepository>();
		Hasher = new Mock<IPasswordHashService>();

		Hasher
			.Setup(h => h.Hash(It.IsAny<string>()))
			.Returns(PasswordHash.Create("$argon2id$v=19$new-hash"));

		Handler = new ResetPasswordHandler(ResetTokenRepo.Object, UserRepo.Object, Hasher.Object);
	}

	public Mock<IPasswordResetTokenRepository> ResetTokenRepo { get; }
	public Mock<IUserRepository> UserRepo { get; }
	public Mock<IPasswordHashService> Hasher { get; }
	public ResetPasswordHandler Handler { get; }

	[Fact]
	[Trait("AC", "M1.1UC6")]
	public async Task HandleAsync_ValidTokenAndPassword_CompletesReset()
	{
		var rawToken = "valid-raw-token";
		var token = CreateValidToken(rawToken);

		ResetTokenRepo
			.Setup(r => r.GetByTokenHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync(token);

		await Handler.HandleAsync(
			new ResetPasswordCommand(new ResetPasswordRequest(rawToken, _validPassword)),
			TestContext.Current.CancellationToken);

		ResetTokenRepo.Verify(r => r.UseAsync(token.TokenId, TestContext.Current.CancellationToken), Times.Once);
		UserRepo.Verify(r => r.UpdatePasswordAsync(token.UserId, It.IsAny<string>(), true, TestContext.Current.CancellationToken), Times.Once);
		Hasher.Verify(h => h.Hash(_validPassword), Times.Once);
	}

	[Fact]
	[Trait("AC", "M1.1UC7")]
	public async Task HandleAsync_NonExistentToken_ThrowsInvalidResetTokenException()
	{
		ResetTokenRepo
			.Setup(r => r.GetByTokenHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync((PasswordResetToken?)null);

		await Should.ThrowAsync<InvalidResetTokenException>(
			() => Handler.HandleAsync(
				new ResetPasswordCommand(new ResetPasswordRequest("unknown-token", _validPassword)),
				TestContext.Current.CancellationToken));

		ResetTokenRepo.Verify(r => r.UseAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
		UserRepo.Verify(r => r.UpdatePasswordAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()), Times.Never);
	}

	[Fact]
	[Trait("AC", "M1.1UC7")]
	public async Task HandleAsync_ExpiredToken_ThrowsInvalidResetTokenException()
	{
		var rawToken = "expired-token";
		var expiredToken = new PasswordResetToken(Guid.NewGuid(), Guid.NewGuid(), "hash", DateTime.UtcNow.AddMinutes(-1));

		ResetTokenRepo
			.Setup(r => r.GetByTokenHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync(expiredToken);

		await Should.ThrowAsync<InvalidResetTokenException>(
			() => Handler.HandleAsync(
				new ResetPasswordCommand(new ResetPasswordRequest(rawToken, _validPassword)),
				TestContext.Current.CancellationToken));

		ResetTokenRepo.Verify(r => r.UseAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
		UserRepo.Verify(r => r.UpdatePasswordAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()), Times.Never);
	}

	[Fact]
	[Trait("AC", "M1.1UC7")]
	public async Task HandleAsync_AlreadyUsedToken_ThrowsInvalidResetTokenException()
	{
		var rawToken = "used-token";
		var usedToken = CreateValidToken(rawToken);
		usedToken.MarkUsed();

		ResetTokenRepo
			.Setup(r => r.GetByTokenHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync(usedToken);

		await Should.ThrowAsync<InvalidResetTokenException>(
			() => Handler.HandleAsync(
				new ResetPasswordCommand(new ResetPasswordRequest(rawToken, _validPassword)),
				TestContext.Current.CancellationToken));
	}

	private static PasswordResetToken CreateValidToken(string rawToken)
	{
		var hash = RawToken.From(rawToken).Hash;
		return new PasswordResetToken(Guid.NewGuid(), Guid.NewGuid(), hash, DateTime.UtcNow.AddHours(1));
	}
}