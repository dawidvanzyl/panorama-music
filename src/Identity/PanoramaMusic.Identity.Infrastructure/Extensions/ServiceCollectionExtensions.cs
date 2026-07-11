using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using PanoramaMusic.Identity.Application.Enums;
using PanoramaMusic.Identity.Application.Handlers.Admin;
using PanoramaMusic.Identity.Application.Handlers.Auth;
using PanoramaMusic.Identity.Application.Handlers.Sessions;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Application.Services.Auth;
using PanoramaMusic.Identity.Application.Services.Sessions;
using PanoramaMusic.Identity.Application.Validators.Auth;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Infrastructure.Configurations;
using PanoramaMusic.Identity.Infrastructure.Contexts;
using PanoramaMusic.Identity.Infrastructure.Repositories;
using PanoramaMusic.Identity.Infrastructure.Services;
using System.IdentityModel.Tokens.Jwt;
using System.Text;

namespace PanoramaMusic.Identity.Infrastructure.Extensions;

public static class ServiceCollectionExtensions
{
	public static IServiceCollection AddIdentityInfrastructure(
		this IServiceCollection services,
		IConfiguration configuration)
	{
		services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));
		services.Configure<AdminOptions>(configuration.GetSection(AdminOptions.SectionName));
		services.Configure<SmtpOptions>(configuration.GetSection(SmtpOptions.SectionName));
		services.Configure<HibpOptions>(configuration.GetSection(HibpOptions.SectionName));
		services.Configure<AppOptions>(configuration);
		services.AddRepositories();
		services.AddServices();
		services.AddHandlers();
		services.AddValidatorsFromAssemblyContaining<LoginRequestValidator>();
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

		if (string.IsNullOrWhiteSpace(jwtOptions?.Issuer))
			throw new InvalidOperationException($"'{JwtOptions.SectionName}:{nameof(JwtOptions.Issuer)}' is not configured.");

		if (string.IsNullOrWhiteSpace(jwtOptions.Audience))
			throw new InvalidOperationException($"'{JwtOptions.SectionName}:{nameof(JwtOptions.Audience)}' is not configured.");

		services
			.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
			.AddJwtBearer(options =>
			{
				options.MapInboundClaims = false;
				options.TokenValidationParameters = new TokenValidationParameters
				{
					ValidateIssuer = true,
					ValidIssuer = jwtOptions!.Issuer,
					ValidateAudience = true,
					ValidAudience = jwtOptions.Audience,
					ValidateLifetime = true,
					ValidateIssuerSigningKey = true,
					IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
					ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
					RequireSignedTokens = true,
				};
				options.Events = new JwtBearerEvents
				{
					// Delegates to AccessTokenValidationService, which checks the two distinct
					// revocation mechanisms: a per-session jti denylist (logout) and the account's
					// active status (deactivation/deletion). Kept here as a thin adapter so the
					// actual check stays a directly testable, non-pipeline-coupled service.
					OnTokenValidated = async context =>
					{
						var principal = context.Principal!;
						var jtiClaim = principal.FindFirst(JwtRegisteredClaimNames.Jti)?.Value;
						var subClaim = principal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

						if (!Guid.TryParse(jtiClaim, out var jti) || !Guid.TryParse(subClaim, out var userId))
						{
							context.Fail("Token is missing a valid jti or sub claim.");
							return;
						}

						var validationService = context.HttpContext.RequestServices.GetRequiredService<AccessTokenValidationService>();
						var result = await validationService.ValidateAsync(jti, userId, context.HttpContext.RequestAborted);

						if (result != AccessTokenState.Valid)
						{
							context.Fail(result == AccessTokenState.Revoked
								? "Token has been revoked."
								: "User account is no longer active.");
						}
					},
				};
			});

		services
			.AddAuthorizationBuilder()
			.AddPolicy("AdminPolicy", policy => policy.RequireAssertion(context => context.User.HasRole(Role.Admin)))
			.AddPolicy("TeacherPolicy", policy => policy.RequireAssertion(context => context.User.HasRole(Role.Teacher)));

		return services;
	}

	private static IServiceCollection AddRepositories(this IServiceCollection services)
	{
		services.AddTransient<IUserRepository, UserRepository>();
		services.AddTransient<IUserRoleRepository, UserRoleRepository>();
		services.AddTransient<IInviteTokenRepository, InviteTokenRepository>();
		services.AddTransient<IRefreshTokenRepository, RefreshTokenRepository>();
		services.AddTransient<IRevokedAccessTokenRepository, RevokedAccessTokenRepository>();
		services.AddTransient<IPasswordResetTokenRepository, PasswordResetTokenRepository>();
		return services;
	}

	private static IServiceCollection AddServices(this IServiceCollection services)
	{
		services.AddHttpClient<IHibpPasswordService, HibpPasswordService>(client =>
		{
			client.BaseAddress = new Uri("https://api.pwnedpasswords.com/");
			client.Timeout = TimeSpan.FromSeconds(2);
			client.DefaultRequestHeaders.Add("Add-Padding", "true");
		});
		services.AddSingleton<IDenyListPasswordService, DenyListPasswordService>();
		services.AddSingleton<ICommonPasswordService, CommonPasswordService>();
		services.AddSingleton<IPasswordHashService, Argon2PasswordHashService>();
		services.AddSingleton<IJwtService, JwtService>();
		services.AddSingleton<IHostedService, AdminSeedService>();
		services.AddTransient<IEmailService, SmtpEmailService>();
		services.AddSingleton<IAdminOptions>(sp => sp.GetRequiredService<IOptions<AdminOptions>>().Value);
		services.AddSingleton<IAppOptions>(sp => sp.GetRequiredService<IOptions<AppOptions>>().Value);
		services.AddSingleton<ISessionOptions>(sp => sp.GetRequiredService<IOptions<JwtOptions>>().Value);
		services.AddScoped<IUserContext, UserContext>();
		services.AddScoped<IAccessTokenContext, AccessTokenContext>();
		services.AddScoped<IClientContext, ClientContext>();
		services.AddTransient<AccessTokenValidationService>();
		services.AddTransient<CurrentSessionResolver>();
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
		services.AddTransient<UpdateUserRolesHandler>();
		services.AddTransient<DeactivateUserHandler>();
		services.AddTransient<DeleteUserHandler>();
		services.AddTransient<ActivateUserHandler>();
		services.AddTransient<RequestPasswordResetHandler>();
		services.AddTransient<ResetPasswordHandler>();
		services.AddTransient<RateLimitTokenService>();
		services.AddTransient<GetOwnSessionsHandler>();
		services.AddTransient<RevokeOwnSessionHandler>();
		services.AddTransient<RevokeOwnOtherSessionsHandler>();
		services.AddTransient<GetAllSessionsHandler>();
		services.AddTransient<RevokeSessionHandler>();
		services.AddTransient<RevokeAllSessionsHandler>();
		return services;
	}
}