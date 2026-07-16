using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Domain.ValueObjects;
using PanoramaMusic.Identity.Infrastructure.Services;
using PanoramaMusic.Identity.Tests;
using Xunit;

namespace PanoramaMusic.Identity.Infrastructure.Tests;

public class AdminSeedServiceTests : IClassFixture<IdentityTestFixture>
{
	private readonly IdentityTestContext _context;
	private readonly AdminSeedService _service;

	public AdminSeedServiceTests(IdentityTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_context.Services.HostEnvironmentMock.Setup(e => e.EnvironmentName).Returns("Production");
		_service = _context.ServiceProvider.GetRequiredService<AdminSeedService>();
	}

	[Fact]
	[Trait("AC", "M1UC21")]
	public async Task StartAsync_WhenOptionsNotConfigured_DoesNotCreateUser()
	{
		await _service.StartAsync(TestContext.Current.CancellationToken);

		_context.Repositories.UserRepositoryMock.Verify(r => r.CreateAsync(It.IsAny<User>(), TestContext.Current.CancellationToken), Times.Never);
	}

	[Fact]
	[Trait("AC", "M1UC22")]
	public async Task StartAsync_WhenValidOptionsAndNoExistingAdmin_CreatesAdminUser()
	{
		_context.Options.AdminSeedOptionsMock.Object.Email = "admin@test.com";
		_context.Options.AdminSeedOptionsMock.Object.Password = "StrongPassword1!";
		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByEmailAsync("admin@test.com", It.IsAny<CancellationToken>()))
			.ReturnsAsync((User?)null);

		await _service.StartAsync(TestContext.Current.CancellationToken);

		_context.Repositories.UserRepositoryMock.Verify(r => r.CreateAsync(It.Is<User>(u => u.Email.Value == "admin@test.com"), TestContext.Current.CancellationToken), Times.Once);
		_context.Repositories.UserRoleRepositoryMock.Verify(
			r => r.CreateManyAsync(
				It.IsAny<Guid>(),
				It.Is<IList<Role>>(roles => roles.Count == 1 && roles.Contains(Role.Admin)),
				TestContext.Current.CancellationToken),
			Times.Once);
	}

	[Fact]
	[Trait("AC", "M1.4UC10")]
	public async Task StartAsync_WhenSeedingAdmin_MarksAccountAsRequiringPasswordReset()
	{
		_context.Options.AdminSeedOptionsMock.Object.Email = "admin@test.com";
		_context.Options.AdminSeedOptionsMock.Object.Password = "StrongPassword1!";
		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByEmailAsync("admin@test.com", It.IsAny<CancellationToken>()))
			.ReturnsAsync((User?)null);

		await _service.StartAsync(TestContext.Current.CancellationToken);

		_context.Repositories.UserRepositoryMock.Verify(r => r.CreateAsync(It.Is<User>(u => u.RequiresPasswordReset), TestContext.Current.CancellationToken), Times.Once);
	}

	[Theory]
	[InlineData("Development")]
	[InlineData("QA")]
	[Trait("AC", "M1.4UC10")]
	public async Task StartAsync_InDevelopmentOrQa_DoesNotForcePasswordReset(string environmentName)
	{
		_context.Services.HostEnvironmentMock.Setup(e => e.EnvironmentName).Returns(environmentName);
		_context.Options.AdminSeedOptionsMock.Object.Email = "admin@test.com";
		_context.Options.AdminSeedOptionsMock.Object.Password = "StrongPassword1!";
		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByEmailAsync("admin@test.com", It.IsAny<CancellationToken>()))
			.ReturnsAsync((User?)null);

		await _service.StartAsync(TestContext.Current.CancellationToken);

		_context.Repositories.UserRepositoryMock.Verify(r => r.CreateAsync(It.Is<User>(u => !u.RequiresPasswordReset), TestContext.Current.CancellationToken), Times.Once);
	}

	[Fact]
	[Trait("AC", "M1UC23")]
	public async Task StartAsync_WhenValidOptionsAndAdminAlreadyExists_DoesNotCreateDuplicate()
	{
		_context.Options.AdminSeedOptionsMock.Object.Email = "admin@test.com";
		_context.Options.AdminSeedOptionsMock.Object.Password = "StrongPassword1!";
		var existingUser = new User(Guid.NewGuid(), Email.Create("admin@test.com"), DateTime.UtcNow);
		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByEmailAsync("admin@test.com", It.IsAny<CancellationToken>()))
			.ReturnsAsync(existingUser);

		await _service.StartAsync(TestContext.Current.CancellationToken);

		_context.Repositories.UserRepositoryMock.Verify(r => r.CreateAsync(It.IsAny<User>(), TestContext.Current.CancellationToken), Times.Never);
	}
}