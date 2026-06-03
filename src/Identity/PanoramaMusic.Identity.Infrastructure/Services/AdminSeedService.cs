using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;

namespace PanoramaMusic.Identity.Infrastructure.Services;

/// <summary>
/// One-shot hosted service that bootstraps the default admin user on startup.
/// Reads <c>SEED_ADMIN_EMAIL</c> and <c>SEED_ADMIN_PASSWORD</c> from environment variables.
/// Idempotent — does nothing if the admin already exists.
/// </summary>
public class AdminSeedService(IServiceProvider serviceProvider, ILogger<AdminSeedService> logger) : IHostedService
{
	public async Task StartAsync(CancellationToken cancellationToken)
	{
		var email = Environment.GetEnvironmentVariable("SEED_ADMIN_EMAIL");
		var password = Environment.GetEnvironmentVariable("SEED_ADMIN_PASSWORD");

		if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
		{
			logger.LogInformation("SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD not set — skipping admin seed.");
			return;
		}

		await using var scope = serviceProvider.CreateAsyncScope();

		var userRepo = scope.ServiceProvider.GetRequiredService<IUserRepository>();
		var userRoleRepo = scope.ServiceProvider.GetRequiredService<IUserRoleRepository>();
		var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

		var existing = await userRepo.GetByEmailAsync(email);
		if (existing is not null)
		{
			logger.LogInformation("Admin user with email {Email} already exists — skipping seed.", email);
			return;
		}

		var user = new User(Guid.NewGuid(), Email.Create(email), DateTime.UtcNow);
		user.SetPassword(hasher.Hash(password));
		user.Activate();

		await userRepo.AddAsync(user);
		await userRoleRepo.AddAsync(new UserRole(user.UserId, Role.Admin));

		logger.LogInformation("Admin user {Email} created successfully.", email);
	}

	public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}