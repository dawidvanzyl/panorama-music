using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Audit.Domain;
using PanoramaMusic.Identity.Application.Commands.Auth;
using PanoramaMusic.Identity.Application.Constants;
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

public class ResetPasswordHandlerTests : IClassFixture<IdentityTestFixture>
{
	private const string _validPassword = "NewPass123!";

	private readonly IdentityTestContext _context;
	private readonly ResetPasswordHandler _handler;

	public ResetPasswordHandlerTests(IdentityTestFixture fixture)
	{
		_context = fixture.CreateContext();

		_context.Services.PasswordHashServiceMock
			.Setup(h => h.Hash(It.IsAny<string>()))
			.Returns(PasswordHash.Create("$argon2id$v=19$new-hash"));

		_handler = _context.ServiceProvider.GetRequiredService<ResetPasswordHandler>();
	}

	[Fact]
	[Trait("AC", "M1.1UC6")]
	public async Task HandleAsync_ValidTokenAndPassword_CompletesReset()
	{
		var rawToken = "valid-raw-token";
		var token = PasswordResetTokenFactory.CreateValid(rawToken);
		var user = UserFactory.CreateActive(token.UserId, "reset-user@test.com");

		_context.Repositories.PasswordResetTokenRepositoryMock
			.Setup(r => r.GetByTokenHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync(token);
		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByIdAsync(token.UserId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(user);

		await _handler.HandleAsync(
			new ResetPasswordCommand(new ResetPasswordRequest(rawToken, _validPassword)),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => _context.Repositories.PasswordResetTokenRepositoryMock.Verify(r => r.UseAsync(token.TokenId, TestContext.Current.CancellationToken), Times.Once),
			() => _context.Repositories.UserRepositoryMock.Verify(r => r.UpdatePasswordAsync(token.UserId, It.IsAny<string>(), true, TestContext.Current.CancellationToken), Times.Once),
			() => _context.Services.PasswordHashServiceMock.Verify(h => h.Hash(_validPassword), Times.Once),
			// Pins the fix: the audit event's actor email must come from the user
			// fetched before the write, never a null post-write lookup.
			() => _context.Audit.AuditEventFactoryMock.Verify(
				f => f.Create(
					IdentityAuditEventTypes.PasswordResetCompleted,
					user.UserId,
					user.Email.Value,
					It.IsAny<Guid?>(),
					AuditOutcomes.Success,
					It.IsAny<string?>(),
					It.IsAny<IReadOnlyDictionary<string, object?>?>()),
				Times.Once));
	}

	[Fact]
	[Trait("AC", "M1.1UC7")]
	public async Task HandleAsync_TokenReferencesDeletedUser_ThrowsInvalidResetTokenException()
	{
		var rawToken = "orphaned-token";
		var token = PasswordResetTokenFactory.CreateValid(rawToken);

		_context.Repositories.PasswordResetTokenRepositoryMock
			.Setup(r => r.GetByTokenHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync(token);
		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByIdAsync(token.UserId, It.IsAny<CancellationToken>()))
			.ReturnsAsync((User?)null);

		await Should.ThrowAsync<InvalidResetTokenException>(
			() => _handler.HandleAsync(
				new ResetPasswordCommand(new ResetPasswordRequest(rawToken, _validPassword)),
				TestContext.Current.CancellationToken));

		ShouldlyHelpers.Satisfy(
			() => _context.Repositories.PasswordResetTokenRepositoryMock.Verify(r => r.UseAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never),
			() => _context.Repositories.UserRepositoryMock.Verify(r => r.UpdatePasswordAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()), Times.Never));
	}

	[Fact]
	[Trait("AC", "M1.1UC7")]
	public async Task HandleAsync_NonExistentToken_ThrowsInvalidResetTokenException()
	{
		_context.Repositories.PasswordResetTokenRepositoryMock
			.Setup(r => r.GetByTokenHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync((PasswordResetToken?)null);

		await Should.ThrowAsync<InvalidResetTokenException>(
			() => _handler.HandleAsync(
				new ResetPasswordCommand(new ResetPasswordRequest("unknown-token", _validPassword)),
				TestContext.Current.CancellationToken));

		ShouldlyHelpers.Satisfy(
			() => _context.Repositories.PasswordResetTokenRepositoryMock.Verify(r => r.UseAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never),
			() => _context.Repositories.UserRepositoryMock.Verify(r => r.UpdatePasswordAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()), Times.Never));
	}

	[Fact]
	[Trait("AC", "M1.1UC7")]
	public async Task HandleAsync_ExpiredToken_ThrowsInvalidResetTokenException()
	{
		var rawToken = "expired-token";
		var expiredToken = PasswordResetTokenFactory.CreateExpired(rawToken);

		_context.Repositories.PasswordResetTokenRepositoryMock
			.Setup(r => r.GetByTokenHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync(expiredToken);

		await Should.ThrowAsync<InvalidResetTokenException>(
			() => _handler.HandleAsync(
				new ResetPasswordCommand(new ResetPasswordRequest(rawToken, _validPassword)),
				TestContext.Current.CancellationToken));

		ShouldlyHelpers.Satisfy(
			() => _context.Repositories.PasswordResetTokenRepositoryMock.Verify(r => r.UseAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never),
			() => _context.Repositories.UserRepositoryMock.Verify(r => r.UpdatePasswordAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()), Times.Never));
	}

	[Fact]
	[Trait("AC", "M1.1UC7")]
	public async Task HandleAsync_AlreadyUsedToken_ThrowsInvalidResetTokenException()
	{
		var rawToken = "used-token";
		var usedToken = PasswordResetTokenFactory.CreateUsed(rawToken);

		_context.Repositories.PasswordResetTokenRepositoryMock
			.Setup(r => r.GetByTokenHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync(usedToken);

		await Should.ThrowAsync<InvalidResetTokenException>(
			() => _handler.HandleAsync(
				new ResetPasswordCommand(new ResetPasswordRequest(rawToken, _validPassword)),
				TestContext.Current.CancellationToken));
	}
}