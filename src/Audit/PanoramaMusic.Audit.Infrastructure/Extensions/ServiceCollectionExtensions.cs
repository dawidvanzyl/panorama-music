using Microsoft.Extensions.DependencyInjection;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Infrastructure.Factories;
using PanoramaMusic.Audit.Infrastructure.Repositories;

namespace PanoramaMusic.Audit.Infrastructure.Extensions;

public static class ServiceCollectionExtensions
{
	public static IServiceCollection AddAuditInfrastructure(
		this IServiceCollection services,
		string connectionString)
	{
		services.AddSingleton<IDbConnectionFactory>(_ => new NpgsqlConnectionFactory(connectionString));
		services.AddTransient<IAuditLogger, AuditEventRepository>();
		return services;
	}
}