using Microsoft.Extensions.DependencyInjection;
using PanoramaMusic.Audit.Application.Factories;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Infrastructure.Contexts;
using PanoramaMusic.Audit.Infrastructure.Repositories;

namespace PanoramaMusic.Audit.Infrastructure.Extensions;

public static class ServiceCollectionExtensions
{
	public static IServiceCollection AddAuditInfrastructure(this IServiceCollection services)
	{
		// The repository writes over the scoped IUnitOfWork connection
		// registered by AddInfrastructure, so no context-owned connection
		// factory is needed.
		services.AddTransient<IAuditLogger, AuditEventRepository>();
		services.AddTransient<IAuditContext, AuditContext>();
		services.AddTransient<IAuditEventFactory, AuditEventFactory>();
		return services;
	}
}