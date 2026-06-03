using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using PanoramaMusic.Identity.Application.Handlers.Auth;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Infrastructure.Adapters;
using PanoramaMusic.Identity.Infrastructure.Factory;
using PanoramaMusic.Identity.Infrastructure.Repositories;
using PanoramaMusic.Identity.Infrastructure.Services;

namespace PanoramaMusic.Identity.Infrastructure.Extensions;

public static class ServiceCollectionExtensions
{
	public static IServiceCollection AddIdentityInfrastructure(
		this IServiceCollection services,
		string connectionString)
	{
		services.AddDataAccess(connectionString);
		services.AddRepositories();
		services.AddServices();
		services.AddHandlers();
		return services;
	}

	private static IServiceCollection AddDataAccess(
		this IServiceCollection services,
		string connectionString)
	{
		services.AddSingleton<IDbConnectionFactory>(_ => new NpgsqlConnectionFactory(connectionString));
		services.AddSingleton<IDapperWrapper, DapperWrapper>();
		return services;
	}

	private static IServiceCollection AddRepositories(this IServiceCollection services)
	{
		services.AddTransient<IUserRepository, UserRepository>();
		services.AddTransient<IUserRoleRepository, UserRoleRepository>();
		services.AddTransient<IInviteTokenRepository, InviteTokenRepository>();
		services.AddTransient<IRefreshTokenRepository, RefreshTokenRepository>();
		return services;
	}

	private static IServiceCollection AddServices(this IServiceCollection services)
	{
		services.AddSingleton<IPasswordHasher, Argon2PasswordHasher>();
		services.AddSingleton<IJwtService, JwtService>();
		services.AddSingleton<IHostedService, AdminSeedService>();
		return services;
	}

	private static IServiceCollection AddHandlers(this IServiceCollection services)
	{
		services.AddTransient<LoginHandler>();
		services.AddTransient<RefreshTokenHandler>();
		services.AddTransient<LogoutHandler>();
		services.AddTransient<CompleteRegistrationHandler>();
		return services;
	}
}