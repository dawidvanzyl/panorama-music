using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using PanoramaMusic.Persistence.Factories;
using PanoramaMusic.Persistence.Transactions;

namespace PanoramaMusic.Persistence.Extensions;

public static class ServiceCollectionExtensions
{
	/// <summary>
	/// configureDataSource lets a bounded context register its own Npgsql composite/enum
	/// type mappings (e.g. NpgsqlDataSourceBuilder.MapComposite&lt;T&gt;()) without this
	/// shared project taking a compile-time dependency on that context's persistence
	/// types — the mapping call must run before the data source is built, and this is
	/// the one place that build happens.
	/// </summary>
	public static IServiceCollection AddInfrastructure(
		this IServiceCollection services,
		string connectionString,
		Action<NpgsqlDataSourceBuilder>? configureDataSource = null)
	{
		var dataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString);
		configureDataSource?.Invoke(dataSourceBuilder);
		var dataSource = dataSourceBuilder.Build();

		// Registered via a factory (not the object-instance overload) so the DI
		// container tracks and disposes it on shutdown, releasing the pooled
		// connections cleanly — the container only disposes instances it creates
		// itself, not ones handed to AddSingleton(instance) directly.
		services.AddSingleton(_ => dataSource);
		services.AddSingleton<IDbConnectionFactory>(sp => new NpgsqlConnectionFactory(sp.GetRequiredService<NpgsqlDataSource>()));

		// Scoped so every repository resolved within one request shares the
		// same connection and transaction.
		services.AddScoped<IUnitOfWork, NpgsqlUnitOfWork>();
		return services;
	}
}