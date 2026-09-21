using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using PanoramaMusic.Persistence;
using PanoramaMusic.Persistence.Extensions;
using PanoramaMusic.Persistence.Transactions;
using PanoramaMusic.Reporting.Domain.Interfaces;
using PanoramaMusic.Reporting.Domain.ValueObjects;
using PanoramaMusic.Reporting.Infrastructure.Extensions;
using PanoramaMusic.Students.Infrastructure.Persistence;
using Testcontainers.PostgreSql;
using Xunit;

namespace PanoramaMusic.Reporting.Tests.Fixtures;

/// <summary>
/// Starts a disposable Postgres, provisions the restricted panorama_app role,
/// and runs the Students context migrations (Reporting reads that schema
/// directly and owns none of its own) — mirroring what InitializeDatabase
/// does at application startup. Wires a real DI graph via
/// <c>AddInfrastructure</c> + <c>AddReportingInfrastructure</c>, so reader
/// tests exercise the same DI-composed <see cref="IPopulationReader"/>
/// production code runs.
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
		StudentMigrator.Run(migrationConnectionString);

		var services = new ServiceCollection();
		services.AddInfrastructure(_applicationConnectionString);
		services.AddReportingInfrastructure();
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

	public async ValueTask DisposeAsync()
	{
		await _serviceProvider.DisposeAsync();
		await _postgres.DisposeAsync();
	}
}
