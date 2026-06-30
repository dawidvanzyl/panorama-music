using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;
using PanoramaMusic.Identity.Infrastructure.Configurations;

namespace PanoramaMusic.Identity.Infrastructure.Services;

/// <summary>
/// One-shot hosted service that bootstraps the default admin user on startup.
/// Reads email and password from <see cref="AdminOptions"/>.
/// Idempotent — does nothing if the admin already exists.
/// </summary>
public class AdminSeedService(
	IOptions<AdminOptions> adminOptions,
	IServiceProvider serviceProvider,
	ILogger<AdminSeedService> logger,
	IHostEnvironment hostEnvironment) : IHostedService
{
	public async Task StartAsync(CancellationToken cancellationToken)
	{
		var email = adminOptions.Value.Email;
		var password = adminOptions.Value.Password;

		if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
		{
			logger.LogInformation("Admin email or password not configured — skipping admin seed.");
			return;
		}

		await using var scope = serviceProvider.CreateAsyncScope();

		var userRepo = scope.ServiceProvider.GetRequiredService<IUserRepository>();
		var userRoleRepo = scope.ServiceProvider.GetRequiredService<IUserRoleRepository>();
		var hashService = scope.ServiceProvider.GetRequiredService<IPasswordHashService>();

		var existing = await userRepo.GetByEmailAsync(email, cancellationToken);
		if (existing is not null)
		{
			logger.LogInformation("Admin user with email {Email} already exists — skipping seed.", email);
			return;
		}

		var user = new User(Guid.NewGuid(), Email.Create(email), DateTime.UtcNow);
		user.SetPassword(hashService.Hash(password));
		user.Activate();

		// Only Production deployments are at risk of the documented seed password
		// being left unchanged indefinitely. Development and the QA stack (used by
		// the E2E suite) seed throwaway credentials on every ephemeral run, so
		// forcing rotation there would just break the seeded-admin login path.
		if (hostEnvironment.IsProduction())
			user.RequirePasswordReset();

		await userRepo.AddAsync(user, cancellationToken);
		await userRoleRepo.AddAsync(new UserRole(user.UserId, Role.Admin), cancellationToken);

		logger.LogInformation("Admin user {Email} created successfully.", email);
	}

	public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}