using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Identity.Application.Commands.Auth;
using PanoramaMusic.Identity.Application.Handlers.Auth;
using PanoramaMusic.Identity.Application.Requests.Auth;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Tests;
using PanoramaMusic.Identity.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Application.Tests;

public class RequestPasswordResetHandlerTests : IClassFixture<IdentityTestFixture>
{
	private readonly IdentityTestContext _context;
	private readonly RequestPasswordResetHandler _handler;

	public RequestPasswordResetHandlerTests(IdentityTestFixture fixture)
	{
		_context = fixture.CreateContext();

		_context.Repositories.PasswordResetTokenRepositoryMock
			.Setup(r => r.CreateAsync(It.IsAny<PasswordResetToken>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		_context.Services.EmailServiceMock
			.Setup(e => e.SendPasswordResetAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		_handler = _context.ServiceProvider.GetRequiredService<RequestPasswordResetHandler>();
	}

	[Fact]
	[Trait("AC", "M1.1UC5")]
	public async Task HandleAsync_RegisteredEmail_CreatesTokenAndSendsEmail()
	{
		var user = UserFactory.CreateActive(Guid.NewGuid(), "user@test.com", "$argon2id$v=19$existing-hash");

		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByEmailAsync("user@test.com", It.IsAny<CancellationToken>()))
			.ReturnsAsync(user);

		await _handler.HandleAsync(
			new RequestPasswordResetCommand(new RequestPasswordResetRequest("user@test.com")),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => _context.Repositories.PasswordResetTokenRepositoryMock.Verify(r => r.CreateAsync(It.IsAny<PasswordResetToken>(), TestContext.Current.CancellationToken), Times.Once),
			() => _context.Services.EmailServiceMock.Verify(e => e.SendPasswordResetAsync("user@test.com", It.IsAny<string>(), TestContext.Current.CancellationToken), Times.Once));
	}

	[Fact]
	[Trait("AC", "M1.1UC5")]
	public async Task HandleAsync_UnregisteredEmail_DoesNotSendEmailOrCreateToken()
	{
		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync((User?)null);

		await _handler.HandleAsync(
			new RequestPasswordResetCommand(new RequestPasswordResetRequest("unknown@test.com")),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => _context.Repositories.PasswordResetTokenRepositoryMock.Verify(r => r.CreateAsync(It.IsAny<PasswordResetToken>(), It.IsAny<CancellationToken>()), Times.Never),
			() => _context.Services.EmailServiceMock.Verify(e => e.SendPasswordResetAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never));
	}

	[Fact]
	[Trait("AC", "M1.1UC5")]
	public async Task HandleAsync_RegisteredEmail_TokenExpiresInConfiguredHours()
	{
		var user = UserFactory.CreateActive(Guid.NewGuid(), "user@test.com", "$argon2id$v=19$existing-hash");

		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByEmailAsync("user@test.com", It.IsAny<CancellationToken>()))
			.ReturnsAsync(user);

		PasswordResetToken? captured = null;
		_context.Repositories.PasswordResetTokenRepositoryMock
			.Setup(r => r.CreateAsync(It.IsAny<PasswordResetToken>(), It.IsAny<CancellationToken>()))
			.Callback<PasswordResetToken, CancellationToken>((t, _) => captured = t)
			.Returns(Task.CompletedTask);

		await _handler.HandleAsync(
			new RequestPasswordResetCommand(new RequestPasswordResetRequest("user@test.com")),
			TestContext.Current.CancellationToken);

		captured.ShouldNotBeNull();
		ShouldlyHelpers.Satisfy(
			() => captured.ExpiresAt.ShouldBeGreaterThan(DateTime.UtcNow.AddMinutes(59)),
			() => captured.ExpiresAt.ShouldBeLessThan(DateTime.UtcNow.AddHours(2)));
	}

	[Fact]
	[Trait("AC", "M1.4UC6")]
	public async Task HandleAsync_MixedCaseEmail_NormalizesToLowerCaseBeforeLookup()
	{
		var user = UserFactory.CreateActive(Guid.NewGuid(), "user@test.com", "$argon2id$v=19$existing-hash");

		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByEmailAsync("user@test.com", It.IsAny<CancellationToken>()))
			.ReturnsAsync(user);

		await _handler.HandleAsync(
			new RequestPasswordResetCommand(new RequestPasswordResetRequest("User@Test.com")),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => _context.Repositories.UserRepositoryMock.Verify(r => r.GetByEmailAsync("user@test.com", TestContext.Current.CancellationToken), Times.Once),
			() => _context.Repositories.PasswordResetTokenRepositoryMock.Verify(r => r.CreateAsync(It.IsAny<PasswordResetToken>(), TestContext.Current.CancellationToken), Times.Once));
	}
}