using Microsoft.Extensions.DependencyInjection;
using PanoramaMusic.Persistence.Factories;
using PanoramaMusic.Persistence.Transactions;

namespace PanoramaMusic.Persistence.Extensions;

public static class ServiceCollectionExtensions
{
	public static IServiceCollection AddInfrastructure(
		this IServiceCollection services,
		string connectionString)
	{
		services.AddSingleton<IDbConnectionFactory>(_ => new NpgsqlConnectionFactory(connectionString));

		// Scoped so every repository resolved within one request shares the
		// same connection and transaction.
		services.AddScoped<IUnitOfWork, NpgsqlUnitOfWork>();
		return services;
	}
}