using Moq;
using PanoramaMusic.Identity.Application.Handlers.Auth;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Tests.Identity.Application;

public class LoginHandlerTests
{
    private static (
        Mock<IUserRepository> userRepo,
        Mock<IUserRoleRepository> roleRepo,
        Mock<IPasswordHasher> hasher,
        Mock<IJwtService> jwt,
        Mock<IRefreshTokenRepository> refreshRepo,
        LoginHandler handler) CreateSut()
    {
        var userRepo = new Mock<IUserRepository>();
        var roleRepo = new Mock<IUserRoleRepository>();
        var hasher = new Mock<IPasswordHasher>();
        var jwt = new Mock<IJwtService>();
        var refreshRepo = new Mock<IRefreshTokenRepository>();

        refreshRepo.Setup(r => r.AddAsync(It.IsAny<RefreshToken>())).Returns(Task.CompletedTask);
        jwt.Setup(j => j.GenerateToken(It.IsAny<Guid>(), It.IsAny<IList<Role>>())).Returns("access-token");

        var handler = new LoginHandler(userRepo.Object, roleRepo.Object, hasher.Object, jwt.Object, refreshRepo.Object);
        return (userRepo, roleRepo, hasher, jwt, refreshRepo, handler);
    }

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
        var (userRepo, roleRepo, hasher, _, refreshRepo, handler) = CreateSut();
        var user = CreateActiveUser();

        userRepo.Setup(r => r.GetByEmailAsync("user@test.com")).ReturnsAsync(user);
        roleRepo.Setup(r => r.GetRolesAsync(user.UserId)).ReturnsAsync(new List<Role> { Role.Teacher });
        hasher.Setup(h => h.Verify(It.IsAny<string>(), It.IsAny<PasswordHash>())).Returns(true);

        var result = await handler.HandleAsync(new LoginCommand(new LoginRequest("user@test.com", "password")));

        result.ShouldNotBeNull();
        result.AccessToken.ShouldBe("access-token");
        result.RefreshToken.ShouldNotBeNullOrEmpty();
        refreshRepo.Verify(r => r.AddAsync(It.IsAny<RefreshToken>()), Times.Once);
    }

    [Fact]
    [Trait("AC", "M1UC25")]
    public async Task HandleAsync_InvalidEmail_ThrowsUnauthorizedException()
    {
        var (userRepo, _, _, _, _, handler) = CreateSut();
        userRepo.Setup(r => r.GetByEmailAsync(It.IsAny<string>())).ReturnsAsync((User?)null);

        await Should.ThrowAsync<UnauthorizedException>(
            () => handler.HandleAsync(new LoginCommand(new LoginRequest("unknown@test.com", "password"))));
    }

    [Fact]
    [Trait("AC", "M1UC26")]
    public async Task HandleAsync_WrongPassword_ThrowsUnauthorizedException()
    {
        var (userRepo, _, hasher, _, _, handler) = CreateSut();
        var user = CreateActiveUser();

        userRepo.Setup(r => r.GetByEmailAsync("user@test.com")).ReturnsAsync(user);
        hasher.Setup(h => h.Verify(It.IsAny<string>(), It.IsAny<PasswordHash>())).Returns(false);

        await Should.ThrowAsync<UnauthorizedException>(
            () => handler.HandleAsync(new LoginCommand(new LoginRequest("user@test.com", "wrongpass"))));
    }

    [Fact]
    [Trait("AC", "M1UC27")]
    public async Task HandleAsync_InactiveUser_ThrowsUnauthorizedException()
    {
        var (userRepo, _, hasher, _, _, handler) = CreateSut();
        var user = new User(Guid.NewGuid(), Email.Create("user@test.com"), DateTime.UtcNow);
        user.SetPassword(PasswordHash.Create("$argon2id$v=19$valid"));
        // Not activated

        userRepo.Setup(r => r.GetByEmailAsync("user@test.com")).ReturnsAsync(user);
        hasher.Setup(h => h.Verify(It.IsAny<string>(), It.IsAny<PasswordHash>())).Returns(true);

        await Should.ThrowAsync<UnauthorizedException>(
            () => handler.HandleAsync(new LoginCommand(new LoginRequest("user@test.com", "password"))));
    }
}

public class RefreshTokenHandlerTests
{
    private static (
        Mock<IRefreshTokenRepository> refreshRepo,
        Mock<IUserRepository> userRepo,
        Mock<IUserRoleRepository> roleRepo,
        Mock<IJwtService> jwt,
        RefreshTokenHandler handler) CreateSut()
    {
        var refreshRepo = new Mock<IRefreshTokenRepository>();
        var userRepo = new Mock<IUserRepository>();
        var roleRepo = new Mock<IUserRoleRepository>();
        var jwt = new Mock<IJwtService>();

        refreshRepo.Setup(r => r.AddAsync(It.IsAny<RefreshToken>())).Returns(Task.CompletedTask);
        refreshRepo.Setup(r => r.UpdateAsync(It.IsAny<RefreshToken>())).Returns(Task.CompletedTask);
        jwt.Setup(j => j.GenerateToken(It.IsAny<Guid>(), It.IsAny<IList<Role>>())).Returns("new-access-token");

        var handler = new RefreshTokenHandler(refreshRepo.Object, userRepo.Object, roleRepo.Object, jwt.Object);
        return (refreshRepo, userRepo, roleRepo, jwt, handler);
    }

    [Fact]
    [Trait("AC", "M1UC28")]
    public async Task HandleAsync_ValidToken_RevokesOldAndReturnsNewAuthResult()
    {
        var (refreshRepo, userRepo, roleRepo, _, handler) = CreateSut();
        var rawToken = Guid.NewGuid().ToString();
        var tokenHash = TokenHasher.ComputeSha256Hash(rawToken);
        var userId = Guid.NewGuid();

        var existing = new RefreshToken(Guid.NewGuid(), userId, tokenHash, DateTime.UtcNow.AddDays(7));
        refreshRepo.Setup(r => r.GetByTokenHashAsync(tokenHash)).ReturnsAsync(existing);

        var user = new User(userId, Email.Create("u@test.com"), DateTime.UtcNow);
        user.Activate();
        userRepo.Setup(r => r.GetByIdAsync(userId)).ReturnsAsync(user);
        roleRepo.Setup(r => r.GetRolesAsync(userId)).ReturnsAsync(new List<Role>());

        var result = await handler.HandleAsync(new RefreshTokenCommand(new RefreshTokenRequest(rawToken)));

        result.ShouldNotBeNull();
        result.AccessToken.ShouldBe("new-access-token");
        existing.IsRevoked.ShouldBeTrue();
        refreshRepo.Verify(r => r.UpdateAsync(existing), Times.Once);
        refreshRepo.Verify(r => r.AddAsync(It.IsAny<RefreshToken>()), Times.Once);
    }

    [Fact]
    [Trait("AC", "M1UC29")]
    public async Task HandleAsync_ExpiredToken_ThrowsUnauthorizedException()
    {
        var (refreshRepo, _, _, _, handler) = CreateSut();
        var rawToken = Guid.NewGuid().ToString();
        var tokenHash = TokenHasher.ComputeSha256Hash(rawToken);
        var userId = Guid.NewGuid();

        var expired = new RefreshToken(Guid.NewGuid(), userId, tokenHash, DateTime.UtcNow.AddDays(-1));
        refreshRepo.Setup(r => r.GetByTokenHashAsync(tokenHash)).ReturnsAsync(expired);

        await Should.ThrowAsync<UnauthorizedException>(
            () => handler.HandleAsync(new RefreshTokenCommand(new RefreshTokenRequest(rawToken))));
    }

    [Fact]
    [Trait("AC", "M1UC30")]
    public async Task HandleAsync_RevokedToken_ThrowsUnauthorizedException()
    {
        var (refreshRepo, _, _, _, handler) = CreateSut();
        var rawToken = Guid.NewGuid().ToString();
        var tokenHash = TokenHasher.ComputeSha256Hash(rawToken);
        var userId = Guid.NewGuid();

        var revoked = new RefreshToken(Guid.NewGuid(), userId, tokenHash, DateTime.UtcNow.AddDays(7));
        revoked.Revoke();
        refreshRepo.Setup(r => r.GetByTokenHashAsync(tokenHash)).ReturnsAsync(revoked);

        await Should.ThrowAsync<UnauthorizedException>(
            () => handler.HandleAsync(new RefreshTokenCommand(new RefreshTokenRequest(rawToken))));
    }
}

public class LogoutHandlerTests
{
    private static (Mock<IRefreshTokenRepository> refreshRepo, LogoutHandler handler) CreateSut()
    {
        var refreshRepo = new Mock<IRefreshTokenRepository>();
        refreshRepo.Setup(r => r.UpdateAsync(It.IsAny<RefreshToken>())).Returns(Task.CompletedTask);
        return (refreshRepo, new LogoutHandler(refreshRepo.Object));
    }

    [Fact]
    [Trait("AC", "M1UC31")]
    public async Task HandleAsync_ValidToken_RevokesToken()
    {
        var (refreshRepo, handler) = CreateSut();
        var rawToken = Guid.NewGuid().ToString();
        var tokenHash = TokenHasher.ComputeSha256Hash(rawToken);
        var userId = Guid.NewGuid();

        var token = new RefreshToken(Guid.NewGuid(), userId, tokenHash, DateTime.UtcNow.AddDays(7));
        refreshRepo.Setup(r => r.GetByTokenHashAsync(tokenHash)).ReturnsAsync(token);

        await handler.HandleAsync(new LogoutCommand(rawToken));

        token.IsRevoked.ShouldBeTrue();
        refreshRepo.Verify(r => r.UpdateAsync(token), Times.Once);
    }
}

public class CompleteRegistrationHandlerTests
{
    private static (
        Mock<IInviteTokenRepository> inviteRepo,
        Mock<IUserRepository> userRepo,
        Mock<IPasswordHasher> hasher,
        CompleteRegistrationHandler handler) CreateSut()
    {
        var inviteRepo = new Mock<IInviteTokenRepository>();
        var userRepo = new Mock<IUserRepository>();
        var hasher = new Mock<IPasswordHasher>();

        inviteRepo.Setup(r => r.UpdateAsync(It.IsAny<InviteToken>())).Returns(Task.CompletedTask);
        userRepo.Setup(r => r.UpdateAsync(It.IsAny<User>())).Returns(Task.CompletedTask);
        hasher.Setup(h => h.Hash(It.IsAny<string>())).Returns(PasswordHash.Create("$argon2id$v=19$hashed"));

        return (inviteRepo, userRepo, hasher, new CompleteRegistrationHandler(inviteRepo.Object, userRepo.Object, hasher.Object));
    }

    [Fact]
    [Trait("AC", "M1UC32")]
    public async Task HandleAsync_ValidInviteToken_ActivatesUserAndMarksTokenUsed()
    {
        var (inviteRepo, userRepo, _, handler) = CreateSut();
        var rawToken = Guid.NewGuid().ToString();
        var tokenHash = TokenHasher.ComputeSha256Hash(rawToken);
        var userId = Guid.NewGuid();

        var invite = new InviteToken(Guid.NewGuid(), userId, tokenHash, DateTime.UtcNow.AddDays(7));
        inviteRepo.Setup(r => r.GetByTokenHashAsync(tokenHash)).ReturnsAsync(invite);

        var user = new User(userId, Email.Create("u@test.com"), DateTime.UtcNow);
        userRepo.Setup(r => r.GetByIdAsync(userId)).ReturnsAsync(user);

        await handler.HandleAsync(new CompleteRegistrationCommand(new CompleteRegistrationRequest(rawToken, "NewPass123!")));

        invite.IsUsed.ShouldBeTrue();
        user.IsActive.ShouldBeTrue();
        user.PasswordHash.ShouldNotBeNull();
        userRepo.Verify(r => r.UpdateAsync(user), Times.Once);
        inviteRepo.Verify(r => r.UpdateAsync(invite), Times.Once);
    }

    [Fact]
    [Trait("AC", "M1UC33")]
    public async Task HandleAsync_ExpiredInviteToken_ThrowsDomainException()
    {
        var (inviteRepo, _, _, handler) = CreateSut();
        var rawToken = Guid.NewGuid().ToString();
        var tokenHash = TokenHasher.ComputeSha256Hash(rawToken);
        var userId = Guid.NewGuid();

        var expired = new InviteToken(Guid.NewGuid(), userId, tokenHash, DateTime.UtcNow.AddDays(-1));
        inviteRepo.Setup(r => r.GetByTokenHashAsync(tokenHash)).ReturnsAsync(expired);

        await Should.ThrowAsync<DomainException>(
            () => handler.HandleAsync(new CompleteRegistrationCommand(new CompleteRegistrationRequest(rawToken, "NewPass123!"))));
    }

    [Fact]
    [Trait("AC", "M1UC34")]
    public async Task HandleAsync_AlreadyUsedInviteToken_ThrowsDomainException()
    {
        var (inviteRepo, _, _, handler) = CreateSut();
        var rawToken = Guid.NewGuid().ToString();
        var tokenHash = TokenHasher.ComputeSha256Hash(rawToken);
        var userId = Guid.NewGuid();

        var used = new InviteToken(Guid.NewGuid(), userId, tokenHash, DateTime.UtcNow.AddDays(7));
        used.MarkUsed();
        inviteRepo.Setup(r => r.GetByTokenHashAsync(tokenHash)).ReturnsAsync(used);

        await Should.ThrowAsync<DomainException>(
            () => handler.HandleAsync(new CompleteRegistrationCommand(new CompleteRegistrationRequest(rawToken, "NewPass123!"))));
    }
}
