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
        jwt.Setup(j => j.GenerateToken(It.IsAny<Guid>(), It.IsAny<IList<Role>>())).Returns(new JwtToken("access-token", DateTime.UtcNow));

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
        roleRepo.Setup(r => r.GetRolesAsync(user.UserId)).ReturnsAsync([Role.Teacher]);
        hasher.Setup(h => h.Verify(It.IsAny<string>(), It.IsAny<PasswordHash>())).Returns(true);

        var result = await handler.HandleAsync(new LoginCommand(new LoginRequest("user@test.com", "password")), CancellationToken.None);

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
            () => handler.HandleAsync(new LoginCommand(new LoginRequest("unknown@test.com", "password")), CancellationToken.None));
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
            () => handler.HandleAsync(new LoginCommand(new LoginRequest("user@test.com", "wrongpass")), CancellationToken.None));
    }

    [Fact]
    [Trait("AC", "M1UC27")]
    public async Task HandleAsync_InactiveUser_ThrowsUnauthorizedException()
    {
        var (userRepo, _, hasher, _, _, handler) = CreateSut();
        var user = new User(Guid.NewGuid(), Email.Create("user@test.com"), DateTime.UtcNow);
        user.SetPassword(PasswordHash.Create("$argon2id$v=19$valid"));

        userRepo.Setup(r => r.GetByEmailAsync("user@test.com")).ReturnsAsync(user);
        hasher.Setup(h => h.Verify(It.IsAny<string>(), It.IsAny<PasswordHash>())).Returns(true);

        await Should.ThrowAsync<UnauthorizedException>(
            () => handler.HandleAsync(new LoginCommand(new LoginRequest("user@test.com", "password")), CancellationToken.None));
    }
}
