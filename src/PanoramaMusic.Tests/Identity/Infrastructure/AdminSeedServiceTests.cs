using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;
using PanoramaMusic.Identity.Infrastructure.Services;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Tests.Identity.Infrastructure;

public class AdminSeedServiceTests
{
    [Fact]
    [Trait("AC", "M1UC21")]
    public async Task StartAsync_WhenEnvVarsNotSet_DoesNotCreateUser()
    {
        var prevEmail = Environment.GetEnvironmentVariable("SEED_ADMIN_EMAIL");
        var prevPassword = Environment.GetEnvironmentVariable("SEED_ADMIN_PASSWORD");
        try
        {
            Environment.SetEnvironmentVariable("SEED_ADMIN_EMAIL", null);
            Environment.SetEnvironmentVariable("SEED_ADMIN_PASSWORD", null);

            var mockUserRepo = new Mock<IUserRepository>();
            var mockUserRoleRepo = new Mock<IUserRoleRepository>();
            var services = BuildServices(mockUserRepo, mockUserRoleRepo);

            var sut = new AdminSeedService(services, NullLogger<AdminSeedService>.Instance);
            await sut.StartAsync(CancellationToken.None);

            mockUserRepo.Verify(r => r.AddAsync(It.IsAny<User>()), Times.Never);
        }
        finally
        {
            Environment.SetEnvironmentVariable("SEED_ADMIN_EMAIL", prevEmail);
            Environment.SetEnvironmentVariable("SEED_ADMIN_PASSWORD", prevPassword);
        }
    }

    [Fact]
    [Trait("AC", "M1UC22")]
    public async Task StartAsync_WhenValidEnvVarsAndNoExistingAdmin_CreatesAdminUser()
    {
        var prevEmail = Environment.GetEnvironmentVariable("SEED_ADMIN_EMAIL");
        var prevPassword = Environment.GetEnvironmentVariable("SEED_ADMIN_PASSWORD");
        try
        {
            Environment.SetEnvironmentVariable("SEED_ADMIN_EMAIL", "admin@test.com");
            Environment.SetEnvironmentVariable("SEED_ADMIN_PASSWORD", "StrongPassword1!");

            var mockUserRepo = new Mock<IUserRepository>();
            mockUserRepo.Setup(r => r.GetByEmailAsync("admin@test.com")).ReturnsAsync((User?)null);

            var mockUserRoleRepo = new Mock<IUserRoleRepository>();
            var services = BuildServices(mockUserRepo, mockUserRoleRepo);

            var sut = new AdminSeedService(services, NullLogger<AdminSeedService>.Instance);
            await sut.StartAsync(CancellationToken.None);

            mockUserRepo.Verify(
                r => r.AddAsync(It.Is<User>(u => u.Email.Value == "admin@test.com")),
                Times.Once);
            mockUserRoleRepo.Verify(
                r => r.AddAsync(It.Is<UserRole>(ur => ur.Role == Role.Admin)),
                Times.Once);
        }
        finally
        {
            Environment.SetEnvironmentVariable("SEED_ADMIN_EMAIL", prevEmail);
            Environment.SetEnvironmentVariable("SEED_ADMIN_PASSWORD", prevPassword);
        }
    }

    [Fact]
    [Trait("AC", "M1UC23")]
    public async Task StartAsync_WhenValidEnvVarsAndAdminAlreadyExists_DoesNotCreateDuplicate()
    {
        var prevEmail = Environment.GetEnvironmentVariable("SEED_ADMIN_EMAIL");
        var prevPassword = Environment.GetEnvironmentVariable("SEED_ADMIN_PASSWORD");
        try
        {
            Environment.SetEnvironmentVariable("SEED_ADMIN_EMAIL", "admin@test.com");
            Environment.SetEnvironmentVariable("SEED_ADMIN_PASSWORD", "StrongPassword1!");

            var existingUser = new User(Guid.NewGuid(), Email.Create("admin@test.com"), DateTime.UtcNow);
            var mockUserRepo = new Mock<IUserRepository>();
            mockUserRepo.Setup(r => r.GetByEmailAsync("admin@test.com")).ReturnsAsync(existingUser);

            var mockUserRoleRepo = new Mock<IUserRoleRepository>();
            var services = BuildServices(mockUserRepo, mockUserRoleRepo);

            var sut = new AdminSeedService(services, NullLogger<AdminSeedService>.Instance);
            await sut.StartAsync(CancellationToken.None);

            mockUserRepo.Verify(r => r.AddAsync(It.IsAny<User>()), Times.Never);
        }
        finally
        {
            Environment.SetEnvironmentVariable("SEED_ADMIN_EMAIL", prevEmail);
            Environment.SetEnvironmentVariable("SEED_ADMIN_PASSWORD", prevPassword);
        }
    }

    private static IServiceProvider BuildServices(
        Mock<IUserRepository> mockUserRepo,
        Mock<IUserRoleRepository> mockUserRoleRepo)
    {
        var services = new ServiceCollection();
        services.AddSingleton(mockUserRepo.Object);
        services.AddSingleton(mockUserRoleRepo.Object);
        services.AddSingleton<IPasswordHasher, Argon2PasswordHasher>();
        return services.BuildServiceProvider();
    }
}
