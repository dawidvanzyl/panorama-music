using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using PanoramaMusic.Identity.Application;
using PanoramaMusic.Identity.Application.Handlers.Admin;
using PanoramaMusic.Identity.Application.Handlers.Auth;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Infrastructure.Configurations;
using PanoramaMusic.Identity.Infrastructure.Factories;
using PanoramaMusic.Identity.Infrastructure.Repositories;
using PanoramaMusic.Identity.Infrastructure.Services;
using System.Text;

namespace PanoramaMusic.Identity.Infrastructure.Extensions;

public static class ServiceCollectionExtensions
{
	public static IServiceCollection AddIdentityInfrastructure(
		this IServiceCollection services,
		string connectionString,
		IConfiguration configuration)
	{
		services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));
		services.Configure<AdminOptions>(configuration.GetSection(AdminOptions.SectionName));
		services.Configure<SmtpOptions>(configuration.GetSection(SmtpOptions.SectionName));
		services.AddDataAccess(connectionString);
		services.AddRepositories();
		services.AddServices();
		services.AddHandlers();
		return services;
	}

	public static IServiceCollection AddIdentityAuthentication(
		this IServiceCollection services,
		IConfiguration configuration)
	{
		var jwtOptions = configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>();
		var secret = jwtOptions?.Secret;

		if (string.IsNullOrWhiteSpace(secret))
			throw new InvalidOperationException($"'{JwtOptions.SectionName}:{nameof(JwtOptions.Secret)}' is not configured.");

		services
			.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
			.AddJwtBearer(options =>
			{
				options.MapInboundClaims = false;
				options.TokenValidationParameters = new TokenValidationParameters
				{
					ValidateIssuer = false,
					ValidateAudience = false,
					ValidateLifetime = true,
					ValidateIssuerSigningKey = true,
					IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
				};
			});

		services
			.AddAuthorizationBuilder()
			.AddPolicy("AdminPolicy", policy => policy.RequireAssertion(context => context.User.HasRole(Role.Admin)))
			.AddPolicy("TeacherPolicy", policy => policy.RequireAssertion(context => context.User.HasRole(Role.Teacher)));

		return services;
	}

	private static IServiceCollection AddDataAccess(
		this IServiceCollection services,
		string connectionString)
	{
		services.AddSingleton<IDbConnectionFactory>(_ => new NpgsqlConnectionFactory(connectionString));
		return services;
	}

	private static IServiceCollection AddRepositories(this IServiceCollection services)
	{
		services.AddTransient<IUserRepository, UserRepository>();
		services.AddTransient<IUserRoleRepository, UserRoleRepository>();
		services.AddTransient<IInviteTokenRepository, InviteTokenRepository>();
		services.AddTransient<IRefreshTokenRepository, RefreshTokenRepository>();
		services.AddTransient<IPasswordResetTokenRepository, PasswordResetTokenRepository>();
		return services;
	}

	private static IServiceCollection AddServices(this IServiceCollection services)
	{
		services.AddSingleton<IPasswordHasher, Argon2PasswordHasher>();
		services.AddSingleton<IJwtService, JwtService>();
		services.AddSingleton<IHostedService, AdminSeedService>();
		services.AddTransient<IEmailSender, SmtpEmailSender>();
		return services;
	}

	private static IServiceCollection AddHandlers(this IServiceCollection services)
	{
		services.AddTransient<LoginHandler>();
		services.AddTransient<RefreshTokenHandler>();
		services.AddTransient<LogoutHandler>();
		services.AddTransient<CompleteRegistrationHandler>();
		services.AddTransient<CreateUserHandler>();
		services.AddTransient<RegenerateInviteTokenHandler>();
		services.AddTransient<GetUsersHandler>();
		services.AddTransient<RequestPasswordResetHandler>();
		services.AddTransient<ResetPasswordHandler>();
		return services;
	}
}