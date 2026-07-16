using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Identity.Application.Handlers.Admin;
using PanoramaMusic.Identity.Application.Handlers.Auth;
using PanoramaMusic.Identity.Application.Handlers.Sessions;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Application.Services.Auth;
using PanoramaMusic.Identity.Application.Services.Sessions;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Infrastructure.Services;
using System.Net.Http.Headers;

namespace PanoramaMusic.Identity.Tests;

public sealed class IdentityTestFixture
{
	public static readonly Uri MailerBaseAddress = new("https://smtp.maileroo.com/");

	public IdentityTestContext CreateContext()
	{
		return new IdentityTestContext(context =>
		{
			var services = new ServiceCollection();

			ConfigureAudit(services, context);
			RegisterOptions(services, context);
			RegisterContexts(services, context);
			RegisterResolvers(services);
			RegisterHandlers(services);
			RegisterServices(services, context);
			RegisterRepositories(services, context);

			return services.BuildServiceProvider();
		});
	}

	private void ConfigureAudit(ServiceCollection services, IdentityTestContext context)
	{
		services.AddTransient(sp => context.Audit.AuditLoggerMock.Object);
		services.AddTransient(sp => context.Audit.AuditEventFactoryMock.Object);

		context.Audit.AuditEventFactoryMock
			.Setup(f => f.Create(
				It.IsAny<string>(), It.IsAny<Guid?>(), It.IsAny<string?>(), It.IsAny<Guid?>(),
				It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<IReadOnlyDictionary<string, object?>?>()))
			.Returns(new AuditEvent(Guid.NewGuid(), DateTime.UtcNow, "test", null, null, null, "127.0.0.1", "test-agent", Guid.NewGuid(), "success", null, new Dictionary<string, object?>()));
	}

	private void RegisterOptions(ServiceCollection services, IdentityTestContext context)
	{
		services.AddSingleton(sp => context.Options.AppOptionsMock.Object);
		services.AddSingleton(sp => context.Options.AdminOptionsMock.Object);
		services.AddSingleton(sp => context.Options.SessionOptionsMock.Object);
	}

	private void RegisterContexts(ServiceCollection services, IdentityTestContext context)
	{
		services.AddScoped(sp => context.Contexts.UserContextMock.Object);
		services.AddScoped(sp => context.Contexts.ClientContextMock.Object);
		services.AddScoped(sp => context.Contexts.AccessTokenContextMock.Object);
	}

	private void RegisterResolvers(ServiceCollection services)
	{
		services.AddTransient<CurrentSessionResolver>();
	}

	private void RegisterHandlers(ServiceCollection services)
	{
		services.AddTransient<ActivateUserHandler>();
		services.AddTransient<CompleteRegistrationHandler>();
		services.AddTransient<CreateUserHandler>();
		services.AddTransient<DeactivateUserHandler>();
		services.AddTransient<DeleteUserHandler>();
		services.AddTransient<GetAllSessionsHandler>();
		services.AddTransient<GetOwnSessionsHandler>();
		services.AddTransient<GetUsersHandler>();
		services.AddTransient<LoginHandler>();
		services.AddTransient<LogoutHandler>();
		services.AddTransient<RefreshTokenHandler>();
		services.AddTransient<RegenerateInviteTokenHandler>();
		services.AddTransient<RequestPasswordResetHandler>();
		services.AddTransient<ResetPasswordHandler>();
		services.AddTransient<RevokeAllSessionsHandler>();
		services.AddTransient<RevokeOwnOtherSessionsHandler>();
		services.AddTransient<RevokeOwnSessionHandler>();
		services.AddTransient<RevokeSessionHandler>();
		services.AddTransient<UpdateUserRolesHandler>();
	}

	private static void RegisterServices(ServiceCollection services, IdentityTestContext context)
	{
		services.AddSingleton(sp => context.Services.PasswordHashServiceMock.Object);
		services.AddSingleton(sp => context.Services.JwtServiceMock.Object);
		services.AddSingleton(sp => context.Services.EmailServiceMock.Object);
		services.AddSingleton(sp => context.Services.DenyListPasswordServiceMock.Object);

		services.AddTransient<IHibpPasswordService>(sp =>
		{
			var httpClient = new HttpClient(context.Services.HttpMessageHandlerMock.Object) { BaseAddress = new Uri("https://api.pwnedpasswords.com/") };

			return new HibpPasswordService(
				httpClient,
				Options.Create(context.Options.HibpOptions),
				NullLogger<HibpPasswordService>.Instance);
		});

		services.AddTransient<IMailSender>(sp =>
		{
			var httpClient = new HttpClient(context.Services.HttpMessageHandlerMock.Object) { BaseAddress = MailerBaseAddress };
			httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "test-api-key");

			return new MailerooMailSender(httpClient);
		});

		services.AddTransient<ICommonPasswordService>(sp => new CommonPasswordService(
			context.Services.DenyListPasswordServiceMock.Object,
			context.Services.HibpPasswordServiceMock.Object));

		services.AddTransient(sp => new JwtService(Options.Create(context.Options.JwtOptionsMock.Object)));

		services.AddTransient(sp => new AdminSeedService(
			Options.Create(context.Options.AdminSeedOptionsMock.Object),
			sp,
			NullLogger<AdminSeedService>.Instance,
			context.Services.HostEnvironmentMock.Object));

		services.AddTransient<AccessTokenValidationService>();
	}

	private void RegisterRepositories(ServiceCollection services, IdentityTestContext context)
	{
		services.AddScoped(sp => context.Repositories.UnitOfWorkMock.Object);
		services.AddTransient(sp => context.Repositories.RevokedAccessTokenRepositoryMock.Object);
		services.AddTransient(sp => context.Repositories.UserRepositoryMock.Object);
		services.AddTransient(sp => context.Repositories.InviteTokenRepositoryMock.Object);
		services.AddTransient(sp => context.Repositories.UserRoleRepositoryMock.Object);
		services.AddTransient(sp => context.Repositories.RefreshTokenRepositoryMock.Object);
		services.AddTransient(sp => context.Repositories.PasswordResetTokenRepositoryMock.Object);
	}
}