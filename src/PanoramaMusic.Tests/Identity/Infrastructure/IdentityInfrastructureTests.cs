using System.IdentityModel.Tokens.Jwt;
using Xunit;
using System.Text;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.IdentityModel.Tokens;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;
using PanoramaMusic.Identity.Infrastructure.Services;
using Shouldly;

namespace PanoramaMusic.Tests.Identity.Infrastructure;

public class IdentityInfrastructureTests
{
    // ─── Argon2PasswordHasher ────────────────────────────────────────────────

    [Fact]
    [Trait("AC", "M1UC16")]
    public void Hash_WhenPasswordProvided_ReturnsNonEmptyHash()
    {
        var hasher = new Argon2PasswordHasher();

        var result = hasher.Hash("secret");

        result.Value.ShouldNotBeNullOrWhiteSpace();
    }

    [Fact]
    [Trait("AC", "M1UC17")]
    public void Verify_WhenCorrectPassword_ReturnsTrue()
    {
        var hasher = new Argon2PasswordHasher();
        var hash   = hasher.Hash("correct-password");

        var result = hasher.Verify("correct-password", hash);

        result.ShouldBeTrue();
    }

    [Fact]
    [Trait("AC", "M1UC18")]
    public void Verify_WhenWrongPassword_ReturnsFalse()
    {
        var hasher = new Argon2PasswordHasher();
        var hash   = hasher.Hash("original-password");

        var result = hasher.Verify("different-password", hash);

        result.ShouldBeFalse();
    }

    // ─── JwtService ──────────────────────────────────────────────────────────

    [Fact]
    [Trait("AC", "M1UC19")]
    public void GenerateToken_WhenCalledWithUserIdAndRoles_ContainsSubAndRolesClaims()
    {
        Environment.SetEnvironmentVariable("JWT_SECRET", "test-secret-key-that-is-at-least-32-chars!!");
        var service = new JwtService();
        var userId  = Guid.NewGuid();
        var roles   = new List<Role> { Role.Admin };

        var token   = service.GenerateToken(userId, roles);

        var handler = new JwtSecurityTokenHandler();
        var jwt     = handler.ReadJwtToken(token);

        jwt.Subject.ShouldBe(userId.ToString());
        jwt.Claims.ShouldContain(c => c.Type == "roles" && c.Value.Contains("Admin"));
    }

    [Fact]
    [Trait("AC", "M1UC20")]
    public void GenerateToken_WhenValidatedWithSameSecret_ValidatesSuccessfully()
    {
        const string secret = "test-secret-key-that-is-at-least-32-chars!!";
        Environment.SetEnvironmentVariable("JWT_SECRET", secret);
        var service = new JwtService();
        var userId  = Guid.NewGuid();

        var token = service.GenerateToken(userId, [Role.Admin]);

        var handler    = new JwtSecurityTokenHandler();
        var parameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
            ValidateIssuer           = false,
            ValidateAudience         = false,
            ClockSkew                = TimeSpan.Zero,
        };

        var principal = handler.ValidateToken(token, parameters, out _);

        principal.ShouldNotBeNull();
    }

    // ─── AdminSeedService ────────────────────────────────────────────────────

    [Fact]
    [Trait("AC", "M1UC21")]
    public async Task AdminSeedService_WhenEnvVarsNotSet_DoesNotCreateUser()
    {
        Environment.SetEnvironmentVariable("SEED_ADMIN_EMAIL",    null);
        Environment.SetEnvironmentVariable("SEED_ADMIN_PASSWORD", null);

        var userRepo     = new FakeUserRepository();
        var userRoleRepo = new FakeUserRoleRepository();
        var hasher       = new Argon2PasswordHasher();

        var services = new ServiceCollection();
        services.AddSingleton<IUserRepository>(userRepo);
        services.AddSingleton<IUserRoleRepository>(userRoleRepo);
        services.AddSingleton<IPasswordHasher>(hasher);
        var provider = services.BuildServiceProvider();

        var sut = new AdminSeedService(provider, NullLogger<AdminSeedService>.Instance);
        await sut.StartAsync(CancellationToken.None);

        userRepo.AddedUsers.ShouldBeEmpty();
    }

    [Fact]
    [Trait("AC", "M1UC22")]
    public async Task AdminSeedService_WhenValidEnvVarsAndNoExistingAdmin_CreatesAdminUser()
    {
        Environment.SetEnvironmentVariable("SEED_ADMIN_EMAIL",    "admin@test.com");
        Environment.SetEnvironmentVariable("SEED_ADMIN_PASSWORD", "StrongPassword1!");

        var userRepo     = new FakeUserRepository();
        var userRoleRepo = new FakeUserRoleRepository();
        var hasher       = new Argon2PasswordHasher();

        var services = new ServiceCollection();
        services.AddSingleton<IUserRepository>(userRepo);
        services.AddSingleton<IUserRoleRepository>(userRoleRepo);
        services.AddSingleton<IPasswordHasher>(hasher);
        var provider = services.BuildServiceProvider();

        var sut = new AdminSeedService(provider, NullLogger<AdminSeedService>.Instance);
        await sut.StartAsync(CancellationToken.None);

        userRepo.AddedUsers.Count.ShouldBe(1);
        userRepo.AddedUsers[0].Email.Value.ShouldBe("admin@test.com");
        userRoleRepo.AddedRoles.ShouldContain(ur => ur.Role == Role.Admin);
    }

    [Fact]
    [Trait("AC", "M1UC23")]
    public async Task AdminSeedService_WhenValidEnvVarsAndAdminAlreadyExists_DoesNotCreateDuplicate()
    {
        Environment.SetEnvironmentVariable("SEED_ADMIN_EMAIL",    "admin@test.com");
        Environment.SetEnvironmentVariable("SEED_ADMIN_PASSWORD", "StrongPassword1!");

        var existingUser = new User(Guid.NewGuid(), Email.Create("admin@test.com"), DateTime.UtcNow);
        var userRepo     = new FakeUserRepository(existingUser);
        var userRoleRepo = new FakeUserRoleRepository();
        var hasher       = new Argon2PasswordHasher();

        var services = new ServiceCollection();
        services.AddSingleton<IUserRepository>(userRepo);
        services.AddSingleton<IUserRoleRepository>(userRoleRepo);
        services.AddSingleton<IPasswordHasher>(hasher);
        var provider = services.BuildServiceProvider();

        var sut = new AdminSeedService(provider, NullLogger<AdminSeedService>.Instance);
        await sut.StartAsync(CancellationToken.None);

        userRepo.AddedUsers.ShouldBeEmpty();
    }
}

// ─── Fakes ───────────────────────────────────────────────────────────────────

file sealed class FakeUserRepository(User? existingUser = null) : IUserRepository
{
    public List<User> AddedUsers { get; } = [];

    public Task<User?> GetByIdAsync(Guid userId)    => Task.FromResult<User?>(null);
    public Task<User?> GetByEmailAsync(string email) => Task.FromResult(existingUser);

    public Task AddAsync(User user)
    {
        AddedUsers.Add(user);
        return Task.CompletedTask;
    }

    public Task UpdateAsync(User user) => Task.CompletedTask;
}

file sealed class FakeUserRoleRepository : IUserRoleRepository
{
    public List<UserRole> AddedRoles { get; } = [];

    public Task AddAsync(UserRole userRole)
    {
        AddedRoles.Add(userRole);
        return Task.CompletedTask;
    }

    public Task<IList<Role>> GetRolesAsync(Guid userId) => Task.FromResult<IList<Role>>([]);
}
