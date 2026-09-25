using Microsoft.Extensions.DependencyInjection;
using Moq;
using Npgsql;
using PanoramaMusic.Audit.Infrastructure.Extensions;
using PanoramaMusic.Audit.Infrastructure.Persistence;
using PanoramaMusic.DataProtection.Persistence;
using PanoramaMusic.Identity.Infrastructure.Persistence;
using PanoramaMusic.Persistence;
using PanoramaMusic.Persistence.Extensions;
using PanoramaMusic.Persistence.Transactions;
using PanoramaMusic.Reporting.Application.Interfaces;
using PanoramaMusic.Reporting.Domain.Enums;
using PanoramaMusic.Reporting.Domain.Interfaces;
using PanoramaMusic.Reporting.Domain.ValueObjects;
using PanoramaMusic.Reporting.Infrastructure.Extensions;
using PanoramaMusic.Reporting.Infrastructure.Persistence;
using PanoramaMusic.Students.Infrastructure.Persistence;
using PanoramaMusic.Teachers.Infrastructure.Persistence;
using Testcontainers.PostgreSql;
using Xunit;

namespace PanoramaMusic.Reporting.Tests.Fixtures;

/// <summary>
/// Starts a disposable Postgres, provisions the restricted panorama_app role,
/// and runs the DataProtection, Audit, Identity, Student and Teacher context
/// migrations — <c>teachers.teachers</c> references <c>identity.users</c>, so
/// the chain needs Identity ahead of it, in production order — mirroring what
/// InitializeDatabase does at application startup. Wires a real DI graph via
/// <c>AddInfrastructure</c> + <c>AddReportingInfrastructure</c>, so reader
/// tests exercise the same DI-composed production code runs.
/// </summary>
public sealed class ReportingDatabaseFixture : IAsyncLifetime
{
	private readonly PostgreSqlContainer _postgres;
	private ServiceProvider _serviceProvider = null!;
	private string _applicationConnectionString = null!;

	public ReportingDatabaseFixture()
	{
		_postgres = new PostgreSqlBuilder("postgres:16").Build();
	}

	/// <summary>
	/// Overridden per test to stand in for the real, HTTP-bound <c>UserContext</c>.
	/// </summary>
	public Mock<IUserContext> UserContextMock { get; } = new();

	/// <summary>Overrides the singleton <c>TimeProvider.System</c> registered by <c>AddReportingInfrastructure</c>.</summary>
	public SettableTimeProvider TimeProvider { get; } = new();

	public async ValueTask InitializeAsync()
	{
		AppContext.SetSwitch("Npgsql.EnableStoredProcedureCompatMode", true);

		await _postgres.StartAsync();

		var migrationConnectionString = _postgres.GetConnectionString();
		_applicationConnectionString = new NpgsqlConnectionStringBuilder(migrationConnectionString)
		{
			Username = DatabaseMigrator.ApplicationRoleName,
			Password = "panorama_app_test",
		}.ConnectionString;

		DatabaseMigrator.EnsureApplicationRole(migrationConnectionString, _applicationConnectionString);
		DataProtectionMigrator.Run(migrationConnectionString);
		AuditMigrator.Run(migrationConnectionString);
		IdentityMigrator.Run(migrationConnectionString);
		StudentMigrator.Run(migrationConnectionString);
		TeacherMigrator.Run(migrationConnectionString);
		ReportingMigrator.Run(migrationConnectionString);

		var services = new ServiceCollection();
		services.AddInfrastructure(_applicationConnectionString);
		services.AddAuditInfrastructure();
		services.AddReportingInfrastructure();

		// Overrides the real HTTP-bound UserContext registered by
		// AddReportingInfrastructure, the same way ReportingUserContextMock does
		// in PanoramaMusic.Persistence.Tests.
		services.AddScoped(sp => UserContextMock.Object);
		services.AddSingleton<System.TimeProvider>(TimeProvider);

		_serviceProvider = services.BuildServiceProvider();
	}

	/// <summary>
	/// Opens its own connection for direct seed SQL, independent of any
	/// service-provider scope — mirrors <c>StudentsDatabaseFixture.Connection</c>.
	/// </summary>
	public NpgsqlConnection OpenConnection()
	{
		var connection = new NpgsqlConnection(_applicationConnectionString);
		connection.Open();
		return connection;
	}

	/// <summary>
	/// Runs <paramref name="definition"/> through the real, DI-resolved
	/// <see cref="IPopulationReader"/>, in its own scope and unit of work that
	/// always rolls back — so reader tests never interfere with one another's
	/// seeded rows or leak a transaction across test classes running in
	/// parallel.
	/// </summary>
	public async Task<IReadOnlyList<PopulationMember>> ReadPopulationAsync(ReportDefinition definition, CancellationToken cancellationToken)
	{
		await using var scope = _serviceProvider.CreateAsyncScope();
		var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
		await unitOfWork.BeginAsync(cancellationToken);
		try
		{
			var reader = scope.ServiceProvider.GetRequiredService<IPopulationReader>();
			return await reader.ReadAsync(definition, cancellationToken);
		}
		finally
		{
			await unitOfWork.RollbackAsync(cancellationToken);
		}
	}

	/// <summary>
	/// Runs the real, DI-resolved <see cref="ICollectionReader"/> for
	/// <paramref name="collection"/>, in its own scope and unit of work that
	/// always rolls back.
	/// </summary>
	public async Task<IReadOnlyList<CollectionRecord>> ReadCollectionAsync(
		ReportCollection collection, IReadOnlyCollection<Guid> studentIds, CancellationToken cancellationToken)
	{
		await using var scope = _serviceProvider.CreateAsyncScope();
		var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
		await unitOfWork.BeginAsync(cancellationToken);
		try
		{
			var reader = scope.ServiceProvider.GetServices<ICollectionReader>().Single(r => r.Collection == collection);
			return await reader.ReadAsync(studentIds, [], cancellationToken);
		}
		finally
		{
			await unitOfWork.RollbackAsync(cancellationToken);
		}
	}

	/// <summary>
	/// Runs the real, DI-resolved <see cref="IDatasourceOptionReader"/>, in its
	/// own scope and unit of work that always rolls back.
	/// </summary>
	public async Task<IReadOnlyList<FieldOption>> ReadOptionsAsync(ReportDatasource datasource, CancellationToken cancellationToken)
	{
		await using var scope = _serviceProvider.CreateAsyncScope();
		var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
		await unitOfWork.BeginAsync(cancellationToken);
		try
		{
			var reader = scope.ServiceProvider.GetRequiredService<IDatasourceOptionReader>();
			return await reader.ReadAsync(datasource, cancellationToken);
		}
		finally
		{
			await unitOfWork.RollbackAsync(cancellationToken);
		}
	}

	/// <summary>
	/// Runs <paramref name="work"/> in its own DI scope and unit of work that
	/// always rolls back, so tests never leak a saved report or a transaction
	/// across test classes running in parallel.
	/// </summary>
	public async Task<T> ExecuteInScopeAsync<T>(Func<IServiceProvider, Task<T>> work, CancellationToken cancellationToken)
	{
		await using var scope = _serviceProvider.CreateAsyncScope();
		var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
		await unitOfWork.BeginAsync(cancellationToken);
		try
		{
			return await work(scope.ServiceProvider);
		}
		finally
		{
			await unitOfWork.RollbackAsync(cancellationToken);
		}
	}

	public async ValueTask DisposeAsync()
	{
		await _serviceProvider.DisposeAsync();
		await _postgres.DisposeAsync();
	}
}