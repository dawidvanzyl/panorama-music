using Microsoft.Extensions.DependencyInjection;
using Microsoft.Win32;
using Npgsql;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Infrastructure.Extensions;
using PanoramaMusic.Audit.Infrastructure.Persistence;
using PanoramaMusic.Audit.Infrastructure.Repositories;
using PanoramaMusic.Identity.Application.Handlers.Admin;
using PanoramaMusic.Identity.Application.Handlers.Auth;
using PanoramaMusic.Identity.Infrastructure.Persistence;
using PanoramaMusic.Identity.Infrastructure.Repositories;
using PanoramaMusic.Persistence.Extensions;
using PanoramaMusic.Persistence.Tests.DomainEvents;
using PanoramaMusic.Persistence.Tests.Repository;
using PanoramaMusic.Students.Infrastructure.Extensions;
using PanoramaMusic.Students.Infrastructure.Persistence;
using Testcontainers.PostgreSql;
using Xunit;

namespace PanoramaMusic.Persistence.Tests.Fixtures;

/// <summary>
/// Starts a disposable Postgres, provisions the restricted panorama_app role, and
/// runs the Audit, Identity, and Students context migrations. Originally scoped to
/// the two contexts whose writes the shared unit of work must commit and roll back
/// atomically; now doubles as the shared harness for any bounded context's
/// audit-trail tests that need a real Postgres-backed IUnitOfWork.
/// </summary>
public sealed class UnitOfWorkDatabaseFixture : IAsyncLifetime
{
	private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder()
		.WithImage("postgres:16")
		.Build();

	private string _migrationConnectionString = string.Empty;
	private string _applicationConnectionString = string.Empty;

	public async ValueTask InitializeAsync()
	{
		// The repositories call Postgres functions via CommandType.StoredProcedure,
		// which Npgsql 8+ maps to CALL unless the compat switch (also set by
		// Program.cs at startup) is enabled.
		AppContext.SetSwitch("Npgsql.EnableStoredProcedureCompatMode", true);

		await _postgres.StartAsync();

		_migrationConnectionString = _postgres.GetConnectionString();
		_applicationConnectionString = new NpgsqlConnectionStringBuilder(_migrationConnectionString)
		{
			Username = DatabaseMigrator.ApplicationRoleName,
			Password = "panorama_app_test",
		}.ConnectionString;

		DatabaseMigrator.EnsureApplicationRole(_migrationConnectionString, _applicationConnectionString);
		AuditMigrator.Run(_migrationConnectionString);
		IdentityMigrator.Run(_migrationConnectionString);
		StudentMigrator.Run(_migrationConnectionString);
	}

	public UnitOfWorkDatabaseContext CreateContext()
	{
		return new UnitOfWorkDatabaseContext(context =>
		{
			var services = new ServiceCollection();

			services.AddInfrastructure(_applicationConnectionString, dataSourceBuilder =>
			{
				PanoramaMusic.Identity.Infrastructure.Extensions.ServiceCollectionExtensions.ConfigureCompositeTypes(dataSourceBuilder);
				PanoramaMusic.Students.Infrastructure.Extensions.ServiceCollectionExtensions.ConfigureCompositeTypes(dataSourceBuilder);
			});
			services.AddAuditInfrastructure();

			// Registers the real IStudentRepository, Students handlers, and the real
			// Students audit translators — the same call Program.cs makes, so this
			// harness stays in sync with production wiring. The real IUserContext it
			// also registers (which needs an HTTP context that doesn't exist here) is
			// overridden by a mock in RegisterContexts below.
			services.AddStudentsInfrastructure();

			RegisterOptions(services, context);
			RegisterContexts(services, context);
			RegisterHandlers(services);
			RegisterServices(services, context);
			RegisterRepositories(services, context);
			RegisterDomainEventTranslators(services);

			return services.BuildServiceProvider();
		});
	}

	private void RegisterOptions(ServiceCollection services, UnitOfWorkDatabaseContext context)
	{
		services.AddSingleton(sp => context.Options.AdminOptionsMock.Object);
	}

	private void RegisterContexts(ServiceCollection services, UnitOfWorkDatabaseContext context)
	{
		services.AddScoped(sp => context.Contexts.AuditContextMock.Object);
		services.AddScoped(sp => context.Contexts.ClientContextMock.Object);
		services.AddScoped(sp => context.Contexts.IdentityIUserContextMock.Object);
		services.AddScoped(sp => context.Contexts.StudentUserContextMock.Object);

		context.Contexts.AuditContextMock.SetupGet(m => m.SourceIp).Returns("127.0.0.1");
		context.Contexts.AuditContextMock.SetupGet(m => m.UserAgent).Returns("xunit");
	}

	private void RegisterHandlers(ServiceCollection services)
	{
		services.AddTransient<ActivateUserHandler>();
		services.AddTransient<LoginHandler>();
		services.AddTransient<UpdateUserRolesHandler>();
	}

	private void RegisterServices(ServiceCollection services, UnitOfWorkDatabaseContext context)
	{
		services.AddSingleton(sp => context.Services.PasswordHashServiceMock.Object);
		services.AddSingleton(sp => context.Services.JwtServiceMock.Object);
	}

	private void RegisterRepositories(ServiceCollection services, UnitOfWorkDatabaseContext context)
	{
		services.AddTransient(sp => new AuditTrailTestReader(_applicationConnectionString));
		services.AddTransient(sp => new RevokedAccessTokenTestReader(_applicationConnectionString));
		services.AddTransient(sp => context.Repositories.UserRepositoryMock.Object);
		services.AddTransient(sp => context.Repositories.UserRoleRepositoryMock.Object);
		services.AddTransient(sp => context.Repositories.RefreshTokenRepositoryMock.Object);
		services.AddTransient(sp => context.Repositories.PasswordResetTokenRepositoryMock.Object);

		services.AddTransient<UserRepository>();
		services.AddTransient<AuditEventRepository>();
		services.AddTransient<RevokedAccessTokenRepository>();
	}

	private void RegisterDomainEventTranslators(ServiceCollection services)
	{
		services.AddTransient<IAuditEventTranslator, TestOrderPlacedTranslator>();
		services.AddTransient<IAuditEventTranslator, TestSecurityRejectedTranslator>();
	}

	public async ValueTask DisposeAsync()
	{
		await _postgres.DisposeAsync();
	}
}