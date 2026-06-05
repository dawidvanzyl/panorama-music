using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;
using PanoramaMusic.Identity.Infrastructure.Configuration;
using PanoramaMusic.Identity.Infrastructure.Services;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Tests.Identity.Infrastructure;

public class AdminSeedServiceTests
{
	private static AdminSeedService CreateSut(
		AdminOptions adminOptions,
		Mock<IUserRepository> mockUserRepo,
		Mock<IUserRoleRepository> mockUserRoleRepo)
	{
		var options = Options.Create(adminOptions);
		var services = new ServiceCollection();
		services.AddSingleton(mockUserRepo.Object);
		services.AddSingleton(mockUserRoleRepo.Object);
		services.AddSingleton<IPasswordHasher, Argon2PasswordHasher>();
		var sp = services.BuildServiceProvider();
		return new AdminSeedService(options, sp, NullLogger<AdminSeedService>.Instance);
	}

	[Fact]
	[Trait("AC", "M1UC21")]
	public async Task StartAsync_WhenOptionsNotConfigured_DoesNotCreateUser()
	{
		var mockUserRepo = new Mock<IUserRepository>();
		var mockUserRoleRepo = new Mock<IUserRoleRepository>();
		var sut = CreateSut(new AdminOptions(), mockUserRepo, mockUserRoleRepo);

		await sut.StartAsync(CancellationToken.None);

		mockUserRepo.Verify(r => r.AddAsync(It.IsAny<User>()), Times.Never);
	}

	[Fact]
	[Trait("AC", "M1UC22")]
	public async Task StartAsync_WhenValidOptionsAndNoExistingAdmin_CreatesAdminUser()
	{
		var mockUserRepo = new Mock<IUserRepository>();
		mockUserRepo.Setup(r => r.GetByEmailAsync("admin@test.com")).ReturnsAsync((User?)null);

		var mockUserRoleRepo = new Mock<IUserRoleRepository>();
		var sut = CreateSut(
			new AdminOptions { Email = "admin@test.com", Password = "StrongPassword1!" },
			mockUserRepo,
			mockUserRoleRepo);

		await sut.StartAsync(CancellationToken.None);

		mockUserRepo.Verify(
			r => r.AddAsync(It.Is<User>(u => u.Email.Value == "admin@test.com")),
			Times.Once);
		mockUserRoleRepo.Verify(
			r => r.AddAsync(It.Is<UserRole>(ur => ur.Role == Role.Admin)),
			Times.Once);
	}

	[Fact]
	[Trait("AC", "M1UC23")]
	public async Task StartAsync_WhenValidOptionsAndAdminAlreadyExists_DoesNotCreateDuplicate()
	{
		var existingUser = new User(Guid.NewGuid(), Email.Create("admin@test.com"), DateTime.UtcNow);
		var mockUserRepo = new Mock<IUserRepository>();
		mockUserRepo.Setup(r => r.GetByEmailAsync("admin@test.com")).ReturnsAsync(existingUser);

		var mockUserRoleRepo = new Mock<IUserRoleRepository>();
		var sut = CreateSut(
			new AdminOptions { Email = "admin@test.com", Password = "StrongPassword1!" },
			mockUserRepo,
			mockUserRoleRepo);

		await sut.StartAsync(CancellationToken.None);

		mockUserRepo.Verify(r => r.AddAsync(It.IsAny<User>()), Times.Never);
	}
}