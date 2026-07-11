using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;
using PanoramaMusic.Identity.Infrastructure.Configurations;
using PanoramaMusic.Identity.Infrastructure.Services;
using PanoramaMusic.Persistence.Transactions;
using Xunit;

namespace PanoramaMusic.Tests.Identity.Infrastructure;

public class AdminSeedServiceTests
{
	private static AdminSeedService CreateService(
		AdminOptions adminOptions,
		Mock<IUserRepository> mockUserRepo,
		Mock<IUserRoleRepository> mockUserRoleRepo,
		string environmentName = "Production")
	{
		var options = Options.Create(adminOptions);
		var services = new ServiceCollection();
		services.AddSingleton(mockUserRepo.Object);
		services.AddSingleton(mockUserRoleRepo.Object);
		services.AddSingleton<IPasswordHashService, Argon2PasswordHashService>();

		// The seed service owns the unit-of-work lifecycle in its own scope;
		// a loose mock satisfies Begin/Commit without a real database.
		services.AddScoped<IUnitOfWork>(_ => new Mock<IUnitOfWork>().Object);
		var sp = services.BuildServiceProvider();
		var mockHostEnvironment = new Mock<IHostEnvironment>();
		mockHostEnvironment.SetupGet(e => e.EnvironmentName).Returns(environmentName);
		return new AdminSeedService(options, sp, NullLogger<AdminSeedService>.Instance, mockHostEnvironment.Object);
	}

	[Fact]
	[Trait("AC", "M1UC21")]
	public async Task StartAsync_WhenOptionsNotConfigured_DoesNotCreateUser()
	{
		var mockUserRepo = new Mock<IUserRepository>();
		var mockUserRoleRepo = new Mock<IUserRoleRepository>();
		var service = CreateService(new AdminOptions(), mockUserRepo, mockUserRoleRepo);

		await service.StartAsync(TestContext.Current.CancellationToken);

		mockUserRepo.Verify(r => r.CreateAsync(It.IsAny<User>(), TestContext.Current.CancellationToken), Times.Never);
	}

	[Fact]
	[Trait("AC", "M1UC22")]
	public async Task StartAsync_WhenValidOptionsAndNoExistingAdmin_CreatesAdminUser()
	{
		var mockUserRepo = new Mock<IUserRepository>();
		mockUserRepo
			.Setup(r => r.GetByEmailAsync("admin@test.com", It.IsAny<CancellationToken>()))
			.ReturnsAsync((User?)null);

		var mockUserRoleRepo = new Mock<IUserRoleRepository>();
		var service = CreateService(
			new AdminOptions { Email = "admin@test.com", Password = "StrongPassword1!" },
			mockUserRepo,
			mockUserRoleRepo);

		await service.StartAsync(TestContext.Current.CancellationToken);

		mockUserRepo.Verify(r => r.CreateAsync(It.Is<User>(u => u.Email.Value == "admin@test.com"), TestContext.Current.CancellationToken), Times.Once);
		mockUserRoleRepo.Verify(r => r.CreateAsync(It.Is<UserRole>(ur => ur.Role == Role.Admin), TestContext.Current.CancellationToken), Times.Once);
	}

	[Fact]
	[Trait("AC", "M1.4UC10")]
	public async Task StartAsync_WhenSeedingAdmin_MarksAccountAsRequiringPasswordReset()
	{
		var mockUserRepo = new Mock<IUserRepository>();
		mockUserRepo
			.Setup(r => r.GetByEmailAsync("admin@test.com", It.IsAny<CancellationToken>()))
			.ReturnsAsync((User?)null);

		var mockUserRoleRepo = new Mock<IUserRoleRepository>();
		var service = CreateService(
			new AdminOptions { Email = "admin@test.com", Password = "StrongPassword1!" },
			mockUserRepo,
			mockUserRoleRepo);

		await service.StartAsync(TestContext.Current.CancellationToken);

		mockUserRepo.Verify(r => r.CreateAsync(It.Is<User>(u => u.RequiresPasswordReset), TestContext.Current.CancellationToken), Times.Once);
	}

	[Theory]
	[InlineData("Development")]
	[InlineData("QA")]
	[Trait("AC", "M1.4UC10")]
	public async Task StartAsync_InDevelopmentOrQa_DoesNotForcePasswordReset(string environmentName)
	{
		var mockUserRepo = new Mock<IUserRepository>();
		mockUserRepo
			.Setup(r => r.GetByEmailAsync("admin@test.com", It.IsAny<CancellationToken>()))
			.ReturnsAsync((User?)null);

		var mockUserRoleRepo = new Mock<IUserRoleRepository>();
		var service = CreateService(
			new AdminOptions { Email = "admin@test.com", Password = "StrongPassword1!" },
			mockUserRepo,
			mockUserRoleRepo,
			environmentName);

		await service.StartAsync(TestContext.Current.CancellationToken);

		mockUserRepo.Verify(r => r.CreateAsync(It.Is<User>(u => !u.RequiresPasswordReset), TestContext.Current.CancellationToken), Times.Once);
	}

	[Fact]
	[Trait("AC", "M1UC23")]
	public async Task StartAsync_WhenValidOptionsAndAdminAlreadyExists_DoesNotCreateDuplicate()
	{
		var existingUser = new User(Guid.NewGuid(), Email.Create("admin@test.com"), DateTime.UtcNow);
		var mockUserRepo = new Mock<IUserRepository>();
		mockUserRepo
			.Setup(r => r.GetByEmailAsync("admin@test.com", It.IsAny<CancellationToken>()))
			.ReturnsAsync(existingUser);

		var mockUserRoleRepo = new Mock<IUserRoleRepository>();
		var service = CreateService(
			new AdminOptions { Email = "admin@test.com", Password = "StrongPassword1!" },
			mockUserRepo,
			mockUserRoleRepo);

		await service.StartAsync(TestContext.Current.CancellationToken);

		mockUserRepo.Verify(r => r.CreateAsync(It.IsAny<User>(), TestContext.Current.CancellationToken), Times.Never);
	}
}