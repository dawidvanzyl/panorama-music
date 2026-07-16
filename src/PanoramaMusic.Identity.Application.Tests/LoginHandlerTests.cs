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

public class LoginHandlerTests : IClassFixture<IdentityTestFixture>
{
	private readonly IdentityTestContext _context;
	private readonly LoginHandler _handler;

	public LoginHandlerTests(IdentityTestFixture fixture)
	{
		_context = fixture.CreateContext();

		// Run the isolated work inline so repository verifications still observe
		// the calls made inside the isolated block.
		_context.Repositories.UnitOfWorkMock
			.Setup(u => u.ExecuteIsolatedAsync(It.IsAny<Func<Task>>(), It.IsAny<CancellationToken>()))
			.Returns<Func<Task>, CancellationToken>((work, _) => work());

		_context.Repositories.RefreshTokenRepositoryMock
			.Setup(r => r.CreateAsync(It.IsAny<RefreshToken>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		_context.Repositories.PasswordResetTokenRepositoryMock
			.Setup(r => r.CreateAsync(It.IsAny<PasswordResetToken>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		_context.Services.JwtServiceMock
			.Setup(j => j.GenerateToken(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<IList<Role>>()))
			.Returns(new JwtToken("access-token", DateTime.UtcNow, Guid.NewGuid()));

		_handler = _context.ServiceProvider.GetRequiredService<LoginHandler>();
	}

	[Fact]
	[Trait("AC", "M1UC24")]
	public async Task HandleAsync_ValidCredentials_ReturnsAuthResult()
	{
		var userId = Guid.NewGuid();
		var userEmail = "user@test.com";

		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByEmailAsync(userEmail, It.IsAny<CancellationToken>()))
			.ReturnsAsync(UserFactory.CreateActive(userId, userEmail));

		_context.Repositories.UserRoleRepositoryMock
			.Setup(r => r.GetRolesAsync(userId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([Role.Teacher]);

		_context.Services.PasswordHashServiceMock
			.Setup(h => h.Verify(It.IsAny<string>(), It.IsAny<PasswordHash>()))
			.Returns(true);

		var result = await _handler.HandleAsync(new LoginCommand(new LoginRequest(userEmail, "password")), TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
		() =>
		{
			result.ShouldNotBeNull();
			result.RequiresPasswordReset.ShouldBeFalse();
			result.Tokens
				.ShouldNotBeNull()
				.ShouldSatisfyAllConditions(
					tokens => tokens.AccessToken.ShouldBe("access-token"),
					tokens => tokens.RefreshToken.ShouldNotBeNullOrEmpty());
		},
		() => _context.Repositories.RefreshTokenRepositoryMock.Verify(r => r.CreateAsync(It.IsAny<RefreshToken>(), TestContext.Current.CancellationToken), Times.Once));
	}

	[Fact]
	[Trait("AC", "M1UC25")]
	public async Task HandleAsync_InvalidEmail_ThrowsUnauthorizedException()
	{
		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync((User?)null);

		await Should.ThrowAsync<UnauthorizedException>(
			() => _handler.HandleAsync(new LoginCommand(new LoginRequest("unknown@test.com", "password")), TestContext.Current.CancellationToken));
	}

	[Fact]
	[Trait("AC", "M1UC26")]
	public async Task HandleAsync_WrongPassword_ThrowsUnauthorizedException()
	{
		var userEmail = "user@test.com";

		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByEmailAsync(userEmail, It.IsAny<CancellationToken>()))
			.ReturnsAsync(UserFactory.CreateActive(Guid.NewGuid(), userEmail));

		_context.Services.PasswordHashServiceMock
			.Setup(h => h.Verify(It.IsAny<string>(), It.IsAny<PasswordHash>()))
			.Returns(false);

		await Should.ThrowAsync<UnauthorizedException>(
			() => _handler.HandleAsync(new LoginCommand(new LoginRequest(userEmail, "wrongpass")), TestContext.Current.CancellationToken));
	}

	[Fact]
	[Trait("AC", "M1UC27")]
	public async Task HandleAsync_InactiveUser_ThrowsUnauthorizedException()
	{
		var userEmail = "user@test.com";

		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByEmailAsync(userEmail, TestContext.Current.CancellationToken))
			.ReturnsAsync(UserFactory.Create(Guid.NewGuid(), userEmail));

		_context.Services.PasswordHashServiceMock
			.Setup(h => h.Verify(It.IsAny<string>(), It.IsAny<PasswordHash>()))
			.Returns(true);

		await Should.ThrowAsync<UnauthorizedException>(
			() => _handler.HandleAsync(new LoginCommand(new LoginRequest(userEmail, "password")), TestContext.Current.CancellationToken));
	}

	[Fact]
	[Trait("AC", "M1.4UC5")]
	public async Task HandleAsync_UnknownEmailWrongPasswordAndInactiveAccount_ThrowSameGenericError()
	{
		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByEmailAsync("unknown@test.com", It.IsAny<CancellationToken>()))
			.ReturnsAsync((User?)null);
		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByEmailAsync("active@test.com", It.IsAny<CancellationToken>()))
			.ReturnsAsync(UserFactory.CreateActive(Guid.NewGuid(), "active@test.com"));
		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByEmailAsync("inactive@test.com", It.IsAny<CancellationToken>()))
			.ReturnsAsync(UserFactory.Create(Guid.NewGuid(), "inactive@test.com"));

		_context.Services.PasswordHashServiceMock
			.Setup(h => h.Verify(It.IsAny<string>(), It.IsAny<PasswordHash>()))
			.Returns(false);

		var unknownEmailEx = await Should.ThrowAsync<UnauthorizedException>(
			() => _handler.HandleAsync(new LoginCommand(new LoginRequest("unknown@test.com", "password")), TestContext.Current.CancellationToken));

		var wrongPasswordEx = await Should.ThrowAsync<UnauthorizedException>(
			() => _handler.HandleAsync(new LoginCommand(new LoginRequest("active@test.com", "wrongpass")), TestContext.Current.CancellationToken));

		var inactiveAccountEx = await Should.ThrowAsync<UnauthorizedException>(
			() => _handler.HandleAsync(new LoginCommand(new LoginRequest("inactive@test.com", "password")), TestContext.Current.CancellationToken));

		ShouldlyHelpers.Satisfy(
			() => unknownEmailEx.Message.ShouldBe(wrongPasswordEx.Message),
			() => wrongPasswordEx.Message.ShouldBe(inactiveAccountEx.Message));
	}

	[Fact]
	[Trait("AC", "M1.4UC7")]
	public async Task HandleAsync_UnknownEmail_VerifiesAgainstDummyHash()
	{
		var dummyHash = PasswordHash.Create("dummy-salt.dummy-hash");

		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByEmailAsync("unknown@test.com", It.IsAny<CancellationToken>()))
			.ReturnsAsync((User?)null);

		_context.Services.PasswordHashServiceMock
			.Setup(h => h.DummyHash)
			.Returns(dummyHash);

		_context.Services.PasswordHashServiceMock
			.Setup(h => h.Verify(It.IsAny<string>(), It.IsAny<PasswordHash>()))
			.Returns(false);

		await Should.ThrowAsync<UnauthorizedException>(
			() => _handler.HandleAsync(new LoginCommand(new LoginRequest("unknown@test.com", "password")), TestContext.Current.CancellationToken));

		_context.Services.PasswordHashServiceMock.Verify(h => h.Verify("password", dummyHash), Times.Once);
	}

	[Fact]
	[Trait("AC", "M1.4UC7")]
	public async Task HandleAsync_InactiveAccount_VerifiesAgainstDummyHash()
	{
		var dummyHash = PasswordHash.Create("dummy-salt.dummy-hash");

		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByEmailAsync("inactive@test.com", It.IsAny<CancellationToken>()))
			.ReturnsAsync(UserFactory.Create(Guid.NewGuid(), "inactive@test.com"));

		_context.Services.PasswordHashServiceMock
			.Setup(h => h.DummyHash)
			.Returns(dummyHash);

		_context.Services.PasswordHashServiceMock
			.Setup(h => h.Verify(It.IsAny<string>(), It.IsAny<PasswordHash>()))
			.Returns(false);

		await Should.ThrowAsync<UnauthorizedException>(
			() => _handler.HandleAsync(new LoginCommand(new LoginRequest("inactive@test.com", "password")), TestContext.Current.CancellationToken));

		_context.Services.PasswordHashServiceMock.Verify(h => h.Verify("password", dummyHash), Times.Once);
	}

	[Fact]
	[Trait("AC", "M1.4UC10")]
	public async Task HandleAsync_CredentialRotationPendingAccount_DeniesNormalAccessAndIssuesResetToken()
	{
		var userEmail = "user@test.com";
		var user = UserFactory.CreateActive(Guid.NewGuid(), userEmail);

		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByEmailAsync(userEmail, It.IsAny<CancellationToken>()))
			.ReturnsAsync(user);

		_context.Services.PasswordHashServiceMock
			.Setup(h => h.Verify(It.IsAny<string>(), It.IsAny<PasswordHash>()))
			.Returns(true);

		var result = await _handler.HandleAsync(new LoginCommand(new LoginRequest(userEmail, "password")), TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.ShouldSatisfyAllConditions(
					result => result.RequiresPasswordReset.ShouldBeTrue(),
					result => result.Tokens.ShouldBeNull(),
					result => result.PasswordResetToken.ShouldNotBeNullOrEmpty()),
			() => _context.Repositories.PasswordResetTokenRepositoryMock.Verify(r => r.CreateAsync(It.Is<PasswordResetToken>(t => t.UserId == user.UserId), TestContext.Current.CancellationToken), Times.Once),
			() => _context.Repositories.RefreshTokenRepositoryMock.Verify(r => r.CreateAsync(It.IsAny<RefreshToken>(), It.IsAny<CancellationToken>()), Times.Never));
	}

	[Fact]
	[Trait("AC", "M1.4UC10")]
	public async Task HandleAsync_AccountWithoutPendingRotation_LogsInNormallyWithNoForcedRotation()
	{
		var userId = Guid.NewGuid();
		var userEmail = "user@test.com";

		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByEmailAsync(userEmail, It.IsAny<CancellationToken>()))
			.ReturnsAsync(UserFactory.CreateActive(userId, userEmail));

		_context.Repositories.UserRoleRepositoryMock
			.Setup(r => r.GetRolesAsync(userId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([Role.Teacher]);

		_context.Services.PasswordHashServiceMock
			.Setup(h => h.Verify(It.IsAny<string>(), It.IsAny<PasswordHash>()))
			.Returns(true);

		var result = await _handler.HandleAsync(new LoginCommand(new LoginRequest(userEmail, "password")), TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.ShouldSatisfyAllConditions(
				result => result.RequiresPasswordReset.ShouldBeFalse(),
				result => result.Tokens.ShouldNotBeNull()),
			() => _context.Repositories.PasswordResetTokenRepositoryMock.Verify(r => r.CreateAsync(It.IsAny<PasswordResetToken>(), It.IsAny<CancellationToken>()), Times.Never));
	}
}