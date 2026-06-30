using Moq;
using PanoramaMusic.Identity.Application.Commands.Auth;
using PanoramaMusic.Identity.Application.Handlers.Auth;
using PanoramaMusic.Identity.Application.Requests.Auth;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Tests.Application;

public class LoginHandlerTests
{
	public LoginHandlerTests()
	{
		UserRepo = new Mock<IUserRepository>();
		RoleRepo = new Mock<IUserRoleRepository>();
		Hasher = new Mock<IPasswordHashService>();
		Jwt = new Mock<IJwtService>();
		RefreshRepo = new Mock<IRefreshTokenRepository>();
		PasswordResetTokenRepo = new Mock<IPasswordResetTokenRepository>();

		RefreshRepo
			.Setup(r => r.AddAsync(It.IsAny<RefreshToken>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		PasswordResetTokenRepo
			.Setup(r => r.AddAsync(It.IsAny<PasswordResetToken>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		Jwt
			.Setup(j => j.GenerateToken(It.IsAny<Guid>(), It.IsAny<IList<Role>>()))
			.Returns(new JwtToken("access-token", DateTime.UtcNow));

		Handler = new LoginHandler(UserRepo.Object, RoleRepo.Object, Hasher.Object, Jwt.Object, RefreshRepo.Object, PasswordResetTokenRepo.Object);
	}

	public Mock<IUserRepository> UserRepo { get; }
	public Mock<IUserRoleRepository> RoleRepo { get; }
	public Mock<IPasswordHashService> Hasher { get; }
	public Mock<IJwtService> Jwt { get; }
	public Mock<IRefreshTokenRepository> RefreshRepo { get; }
	public Mock<IPasswordResetTokenRepository> PasswordResetTokenRepo { get; }
	public LoginHandler Handler { get; }

	private static User CreateActiveUser(string email = "user@test.com", string passwordHashValue = "$argon2id$v=19$valid")
	{
		var user = new User(Guid.NewGuid(), Email.Create(email), DateTime.UtcNow);
		user.SetPassword(PasswordHash.Create(passwordHashValue));
		user.Activate();
		return user;
	}

	[Fact]
	[Trait("AC", "M1UC24")]
	public async Task HandleAsync_ValidCredentials_ReturnsAuthResult()
	{
		var user = CreateActiveUser();

		UserRepo
			.Setup(r => r.GetByEmailAsync("user@test.com", It.IsAny<CancellationToken>()))
			.ReturnsAsync(user);

		RoleRepo
			.Setup(r => r.GetRolesAsync(user.UserId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([Role.Teacher]);

		Hasher
			.Setup(h => h.Verify(It.IsAny<string>(), It.IsAny<PasswordHash>()))
			.Returns(true);

		var result = await Handler.HandleAsync(new LoginCommand(new LoginRequest("user@test.com", "password")), TestContext.Current.CancellationToken);

		result.ShouldNotBeNull();
		result.RequiresPasswordReset.ShouldBeFalse();
		result.Tokens.ShouldNotBeNull();
		result.Tokens.AccessToken.ShouldBe("access-token");
		result.Tokens.RefreshToken.ShouldNotBeNullOrEmpty();
		RefreshRepo.Verify(r => r.AddAsync(It.IsAny<RefreshToken>(), TestContext.Current.CancellationToken), Times.Once);
	}

	[Fact]
	[Trait("AC", "M1UC25")]
	public async Task HandleAsync_InvalidEmail_ThrowsUnauthorizedException()
	{
		UserRepo
			.Setup(r => r.GetByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync((User?)null);

		await Should.ThrowAsync<UnauthorizedException>(
			() => Handler.HandleAsync(new LoginCommand(new LoginRequest("unknown@test.com", "password")), TestContext.Current.CancellationToken));
	}

	[Fact]
	[Trait("AC", "M1UC26")]
	public async Task HandleAsync_WrongPassword_ThrowsUnauthorizedException()
	{
		var user = CreateActiveUser();

		UserRepo
			.Setup(r => r.GetByEmailAsync("user@test.com", It.IsAny<CancellationToken>()))
			.ReturnsAsync(user);

		Hasher
			.Setup(h => h.Verify(It.IsAny<string>(), It.IsAny<PasswordHash>()))
			.Returns(false);

		await Should.ThrowAsync<UnauthorizedException>(
			() => Handler.HandleAsync(new LoginCommand(new LoginRequest("user@test.com", "wrongpass")), TestContext.Current.CancellationToken));
	}

	[Fact]
	[Trait("AC", "M1UC27")]
	public async Task HandleAsync_InactiveUser_ThrowsUnauthorizedException()
	{
		var user = new User(Guid.NewGuid(), Email.Create("user@test.com"), DateTime.UtcNow);
		user.SetPassword(PasswordHash.Create("$argon2id$v=19$valid"));

		UserRepo
			.Setup(r => r.GetByEmailAsync("user@test.com", TestContext.Current.CancellationToken))
			.ReturnsAsync(user);

		Hasher
			.Setup(h => h.Verify(It.IsAny<string>(), It.IsAny<PasswordHash>()))
			.Returns(true);

		await Should.ThrowAsync<UnauthorizedException>(
			() => Handler.HandleAsync(new LoginCommand(new LoginRequest("user@test.com", "password")), TestContext.Current.CancellationToken));
	}

	[Fact]
	[Trait("AC", "M1.4UC5")]
	public async Task HandleAsync_UnknownEmailWrongPasswordAndInactiveAccount_ThrowSameGenericError()
	{
		var activeUser = CreateActiveUser("active@test.com");
		var inactiveUser = new User(Guid.NewGuid(), Email.Create("inactive@test.com"), DateTime.UtcNow);
		inactiveUser.SetPassword(PasswordHash.Create("$argon2id$v=19$valid"));

		UserRepo
			.Setup(r => r.GetByEmailAsync("unknown@test.com", It.IsAny<CancellationToken>()))
			.ReturnsAsync((User?)null);
		UserRepo
			.Setup(r => r.GetByEmailAsync("active@test.com", It.IsAny<CancellationToken>()))
			.ReturnsAsync(activeUser);
		UserRepo
			.Setup(r => r.GetByEmailAsync("inactive@test.com", It.IsAny<CancellationToken>()))
			.ReturnsAsync(inactiveUser);

		Hasher
			.Setup(h => h.Verify(It.IsAny<string>(), It.IsAny<PasswordHash>()))
			.Returns(false);

		var unknownEmailEx = await Should.ThrowAsync<UnauthorizedException>(
			() => Handler.HandleAsync(new LoginCommand(new LoginRequest("unknown@test.com", "password")), TestContext.Current.CancellationToken));

		var wrongPasswordEx = await Should.ThrowAsync<UnauthorizedException>(
			() => Handler.HandleAsync(new LoginCommand(new LoginRequest("active@test.com", "wrongpass")), TestContext.Current.CancellationToken));

		var inactiveAccountEx = await Should.ThrowAsync<UnauthorizedException>(
			() => Handler.HandleAsync(new LoginCommand(new LoginRequest("inactive@test.com", "password")), TestContext.Current.CancellationToken));

		unknownEmailEx.Message.ShouldBe(wrongPasswordEx.Message);
		wrongPasswordEx.Message.ShouldBe(inactiveAccountEx.Message);
	}

	[Fact]
	[Trait("AC", "M1.4UC7")]
	public async Task HandleAsync_UnknownEmailOrInactiveAccount_VerifiesAgainstDummyHash()
	{
		var dummyHash = PasswordHash.Create("dummy-salt.dummy-hash");
		var inactiveUser = new User(Guid.NewGuid(), Email.Create("inactive@test.com"), DateTime.UtcNow);
		inactiveUser.SetPassword(PasswordHash.Create("$argon2id$v=19$valid"));

		UserRepo
			.Setup(r => r.GetByEmailAsync("unknown@test.com", It.IsAny<CancellationToken>()))
			.ReturnsAsync((User?)null);
		UserRepo
			.Setup(r => r.GetByEmailAsync("inactive@test.com", It.IsAny<CancellationToken>()))
			.ReturnsAsync(inactiveUser);

		Hasher.Setup(h => h.DummyHash).Returns(dummyHash);
		Hasher
			.Setup(h => h.Verify(It.IsAny<string>(), It.IsAny<PasswordHash>()))
			.Returns(false);

		await Should.ThrowAsync<UnauthorizedException>(
			() => Handler.HandleAsync(new LoginCommand(new LoginRequest("unknown@test.com", "password")), TestContext.Current.CancellationToken));
		Hasher.Verify(h => h.Verify("password", dummyHash), Times.Once);

		await Should.ThrowAsync<UnauthorizedException>(
			() => Handler.HandleAsync(new LoginCommand(new LoginRequest("inactive@test.com", "password")), TestContext.Current.CancellationToken));
		Hasher.Verify(h => h.Verify("password", dummyHash), Times.Exactly(2));
	}

	[Fact]
	[Trait("AC", "M1.4UC10")]
	public async Task HandleAsync_CredentialRotationPendingAccount_DeniesNormalAccessAndIssuesResetToken()
	{
		var user = CreateActiveUser();
		user.RequirePasswordReset();

		UserRepo
			.Setup(r => r.GetByEmailAsync("user@test.com", It.IsAny<CancellationToken>()))
			.ReturnsAsync(user);

		Hasher
			.Setup(h => h.Verify(It.IsAny<string>(), It.IsAny<PasswordHash>()))
			.Returns(true);

		var result = await Handler.HandleAsync(new LoginCommand(new LoginRequest("user@test.com", "password")), TestContext.Current.CancellationToken);

		result.RequiresPasswordReset.ShouldBeTrue();
		result.Tokens.ShouldBeNull();
		result.PasswordResetToken.ShouldNotBeNullOrEmpty();
		PasswordResetTokenRepo.Verify(r => r.AddAsync(It.Is<PasswordResetToken>(t => t.UserId == user.UserId), TestContext.Current.CancellationToken), Times.Once);
		RefreshRepo.Verify(r => r.AddAsync(It.IsAny<RefreshToken>(), It.IsAny<CancellationToken>()), Times.Never);
	}

	[Fact]
	[Trait("AC", "M1.4UC10")]
	public async Task HandleAsync_AccountWithoutPendingRotation_LogsInNormallyWithNoForcedRotation()
	{
		var user = CreateActiveUser();

		UserRepo
			.Setup(r => r.GetByEmailAsync("user@test.com", It.IsAny<CancellationToken>()))
			.ReturnsAsync(user);

		RoleRepo
			.Setup(r => r.GetRolesAsync(user.UserId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([Role.Teacher]);

		Hasher
			.Setup(h => h.Verify(It.IsAny<string>(), It.IsAny<PasswordHash>()))
			.Returns(true);

		var result = await Handler.HandleAsync(new LoginCommand(new LoginRequest("user@test.com", "password")), TestContext.Current.CancellationToken);

		result.RequiresPasswordReset.ShouldBeFalse();
		result.Tokens.ShouldNotBeNull();
		PasswordResetTokenRepo.Verify(r => r.AddAsync(It.IsAny<PasswordResetToken>(), It.IsAny<CancellationToken>()), Times.Never);
	}
}