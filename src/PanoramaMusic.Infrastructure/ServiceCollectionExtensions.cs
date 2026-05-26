using Microsoft.Extensions.DependencyInjection;
using Npgsql;

namespace PanoramaMusic.Infrastructure;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        string connectionString)
    {
        services.AddTransient<NpgsqlConnection>(_ => new NpgsqlConnection(connectionString));
        return services;
    }
}
