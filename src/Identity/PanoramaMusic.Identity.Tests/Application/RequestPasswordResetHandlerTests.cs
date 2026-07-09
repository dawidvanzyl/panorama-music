using Moq;
using PanoramaMusic.Audit.Application.Factories;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Audit.Domain.Interfaces;
using PanoramaMusic.Identity.Application.Commands.Auth;
using PanoramaMusic.Identity.Application.Handlers.Auth;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Application.Requests.Auth;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Tests.Application;

public class RequestPasswordResetHandlerTests
{
	public RequestPasswordResetHandlerTests()
	{
		UserRepo = new Mock<IUserRepository>();
		ResetTokenRepo = new Mock<IPasswordResetTokenRepository>();
		EmailService = new Mock<IEmailService>();
		AuditLogger = new Mock<IAuditLogger>();
		AuditEventFactory = new Mock<IAuditEventFactory>();

		AuditEventFactory
			.Setup(f => f.Create(
				It.IsAny<string>(), It.IsAny<Guid?>(), It.IsAny<string?>(), It.IsAny<Guid?>(),
				It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<IReadOnlyDictionary<string, object?>?>()))
			.Returns(new AuditEvent(Guid.NewGuid(), DateTime.UtcNow, "test", null, null, null, "127.0.0.1", "test-agent", Guid.NewGuid(), "success", null, new Dictionary<string, object?>()));

		ResetTokenRepo
			.Setup(r => r.CreateAsync(It.IsAny<PasswordResetToken>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		EmailService
			.Setup(e => e.SendPasswordResetAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		Handler = new RequestPasswordResetHandler(UserRepo.Object, ResetTokenRepo.Object, EmailService.Object, AuditLogger.Object, AuditEventFactory.Object);
	}

	public Mock<IUserRepository> UserRepo { get; }
	public Mock<IPasswordResetTokenRepository> ResetTokenRepo { get; }
	public Mock<IEmailService> EmailService { get; }
	public Mock<IAuditLogger> AuditLogger { get; }
	public Mock<IAuditEventFactory> AuditEventFactory { get; }
	public RequestPasswordResetHandler Handler { get; }

	[Fact]
	[Trait("AC", "M1.1UC5")]
	public async Task HandleAsync_RegisteredEmail_CreatesTokenAndSendsEmail()
	{
		var user = new User(Guid.NewGuid(), Email.Create("user@test.com"), DateTime.UtcNow);
		user.SetPassword(PasswordHash.Create("$argon2id$v=19$existing-hash"));
		user.Activate();

		UserRepo
			.Setup(r => r.GetByEmailAsync("user@test.com", It.IsAny<CancellationToken>()))
			.ReturnsAsync(user);

		await Handler.HandleAsync(
			new RequestPasswordResetCommand(new RequestPasswordResetRequest("user@test.com")),
			TestContext.Current.CancellationToken);

		ResetTokenRepo.Verify(r => r.CreateAsync(It.IsAny<PasswordResetToken>(), TestContext.Current.CancellationToken), Times.Once);
		EmailService.Verify(e => e.SendPasswordResetAsync("user@test.com", It.IsAny<string>(), TestContext.Current.CancellationToken), Times.Once);
	}

	[Fact]
	[Trait("AC", "M1.1UC5")]
	public async Task HandleAsync_UnregisteredEmail_DoesNotSendEmailOrCreateToken()
	{
		UserRepo
			.Setup(r => r.GetByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync((User?)null);

		await Handler.HandleAsync(
			new RequestPasswordResetCommand(new RequestPasswordResetRequest("unknown@test.com")),
			TestContext.Current.CancellationToken);

		ResetTokenRepo.Verify(r => r.CreateAsync(It.IsAny<PasswordResetToken>(), It.IsAny<CancellationToken>()), Times.Never);
		EmailService.Verify(e => e.SendPasswordResetAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
	}

	[Fact]
	[Trait("AC", "M1.1UC5")]
	public async Task HandleAsync_RegisteredEmail_TokenExpiresInConfiguredHours()
	{
		var user = new User(Guid.NewGuid(), Email.Create("user@test.com"), DateTime.UtcNow);
		user.SetPassword(PasswordHash.Create("$argon2id$v=19$existing-hash"));
		user.Activate();

		UserRepo
			.Setup(r => r.GetByEmailAsync("user@test.com", It.IsAny<CancellationToken>()))
			.ReturnsAsync(user);

		PasswordResetToken? captured = null;
		ResetTokenRepo
			.Setup(r => r.CreateAsync(It.IsAny<PasswordResetToken>(), It.IsAny<CancellationToken>()))
			.Callback<PasswordResetToken, CancellationToken>((t, _) => captured = t)
			.Returns(Task.CompletedTask);

		await Handler.HandleAsync(
			new RequestPasswordResetCommand(new RequestPasswordResetRequest("user@test.com")),
			TestContext.Current.CancellationToken);

		captured.ShouldNotBeNull();
		captured.ExpiresAt.ShouldBeGreaterThan(DateTime.UtcNow.AddMinutes(59));
		captured.ExpiresAt.ShouldBeLessThan(DateTime.UtcNow.AddHours(2));
	}

	[Fact]
	[Trait("AC", "M1.4UC6")]
	public async Task HandleAsync_MixedCaseEmail_NormalizesToLowerCaseBeforeLookup()
	{
		var user = new User(Guid.NewGuid(), Email.Create("user@test.com"), DateTime.UtcNow);
		user.SetPassword(PasswordHash.Create("$argon2id$v=19$existing-hash"));
		user.Activate();

		UserRepo
			.Setup(r => r.GetByEmailAsync("user@test.com", It.IsAny<CancellationToken>()))
			.ReturnsAsync(user);

		await Handler.HandleAsync(
			new RequestPasswordResetCommand(new RequestPasswordResetRequest("User@Test.com")),
			TestContext.Current.CancellationToken);

		UserRepo.Verify(r => r.GetByEmailAsync("user@test.com", TestContext.Current.CancellationToken), Times.Once);
		ResetTokenRepo.Verify(r => r.CreateAsync(It.IsAny<PasswordResetToken>(), TestContext.Current.CancellationToken), Times.Once);
	}
}