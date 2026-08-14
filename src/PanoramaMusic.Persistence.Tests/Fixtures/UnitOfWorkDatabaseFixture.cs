using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Win32;
using Npgsql;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Infrastructure.Extensions;
using PanoramaMusic.Audit.Infrastructure.Persistence;
using PanoramaMusic.Audit.Infrastructure.Repositories;
using PanoramaMusic.DataProtection.Configurations;
using PanoramaMusic.DataProtection.Extensions;
using PanoramaMusic.DataProtection.Persistence;
using PanoramaMusic.Identity.Application.Handlers.Admin;
using PanoramaMusic.Identity.Application.Handlers.Auth;
using PanoramaMusic.Identity.Infrastructure.Persistence;
using PanoramaMusic.Identity.Infrastructure.Repositories;
using PanoramaMusic.Persistence.Extensions;
using PanoramaMusic.Persistence.Tests.DomainEvents;
using PanoramaMusic.Persistence.Tests.Repository;
using PanoramaMusic.Students.Infrastructure.Extensions;
using PanoramaMusic.Students.Infrastructure.Persistence;
using PanoramaMusic.Teachers.Infrastructure.Extensions;
using PanoramaMusic.Teachers.Infrastructure.Persistence;
using Testcontainers.PostgreSql;
using Xunit;

namespace PanoramaMusic.Persistence.Tests.Fixtures;

/// <summary>
/// Starts a disposable Postgres, provisions the restricted panorama_app role, and
/// runs the DataProtection, Audit, Identity, Students, and Teachers migrations. Originally scoped to
/// the two contexts whose writes the shared unit of work must commit and roll back
/// atomically; now doubles as the shared harness for any bounded context's
/// audit-trail tests that need a real Postgres-backed IUnitOfWork.
/// </summary>
public sealed class UnitOfWorkDatabaseFixture : IAsyncLifetime
{
	private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:16")
		.Build();

	public string ApplicationConnectionString { get; private set; } = string.Empty;

	public string MigrationConnectionString { get; private set; } = string.Empty;

	public async ValueTask InitializeAsync()
	{
		// The repositories call Postgres functions via CommandType.StoredProcedure,
		// which Npgsql 8+ maps to CALL unless the compat switch (also set by
		// Program.cs at startup) is enabled.
		AppContext.SetSwitch("Npgsql.EnableStoredProcedureCompatMode", true);

		await _postgres.StartAsync();

		MigrationConnectionString = _postgres.GetConnectionString();
		ApplicationConnectionString = new NpgsqlConnectionStringBuilder(MigrationConnectionString)
		{
			Username = DatabaseMigrator.ApplicationRoleName,
			Password = "panorama_app_test",
		}.ConnectionString;

		DatabaseMigrator.EnsureApplicationRole(MigrationConnectionString, ApplicationConnectionString);
		DataProtectionMigrator.Run(MigrationConnectionString);
		AuditMigrator.Run(MigrationConnectionString);
		IdentityMigrator.Run(MigrationConnectionString);
		StudentMigrator.Run(MigrationConnectionString);
		TeacherMigrator.Run(MigrationConnectionString);
	}

	public UnitOfWorkDatabaseContext CreateContext()
	{
		return new UnitOfWorkDatabaseContext(context =>
		{
			var services = new ServiceCollection();

			services.AddInfrastructure(ApplicationConnectionString, dataSourceBuilder =>
			{
				PanoramaMusic.Identity.Infrastructure.Extensions.ServiceCollectionExtensions.ConfigureCompositeTypes(dataSourceBuilder);
				PanoramaMusic.Students.Infrastructure.Extensions.ServiceCollectionExtensions.ConfigureCompositeTypes(dataSourceBuilder);
				PanoramaMusic.Teachers.Infrastructure.Extensions.ServiceCollectionExtensions.ConfigureCompositeTypes(dataSourceBuilder);
			});
			services.AddAuditInfrastructure();

			// The real protection provider over the real Postgres-backed keyring —
			// the same wiring Program.cs uses. Banking tests assert on what actually
			// lands in the column, so a stand-in protector would prove nothing.
			services.AddDataProtectionInfrastructure(
				new ConfigurationBuilder()
					.AddInMemoryCollection(new Dictionary<string, string?>
					{
						[$"{KeyringOptions.SectionName}:{nameof(KeyringOptions.ApplicationName)}"] = "PanoramaMusic.Tests",
					})
					.Build());

			// Registers the real IStudentRepository, Students handlers, and the real
			// Students audit translators — the same call Program.cs makes, so this
			// harness stays in sync with production wiring. The real IUserContext it
			// also registers (which needs an HTTP context that doesn't exist here) is
			// overridden by a mock in RegisterContexts below.
			services.AddStudentsInfrastructure();

			// Same reasoning as AddStudentsInfrastructure above: the real banking
			// repository is where the account number is protected and where banking
			// domain events are collected, so the tests drive it rather than a stand-in.
			services.AddTeachersInfrastructure();

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
		services.AddScoped(sp => context.Contexts.TeacherUserContextMock.Object);

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
		services.AddTransient(sp => new AuditTrailTestReader(ApplicationConnectionString));
		services.AddTransient(sp => new RevokedAccessTokenTestReader(ApplicationConnectionString));
		services.AddTransient(sp => new BankingDetailsTestReader(ApplicationConnectionString));
		services.AddTransient(sp => new TeacherTestReader(ApplicationConnectionString));
		services.AddTransient(sp => new ForeignKeyIndexTestReader(ApplicationConnectionString, MigrationConnectionString));
		services.AddTransient(sp => context.Directories.AccountDirectoryMock.Object);
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