using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using PanoramaMusic.Audit.Application.Factories;
using PanoramaMusic.Audit.Application.Handlers;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Application.Validators;
using PanoramaMusic.Audit.Domain.Interfaces;
using PanoramaMusic.Audit.Infrastructure.Contexts;
using PanoramaMusic.Audit.Infrastructure.Repositories;
using PanoramaMusic.Audit.Infrastructure.Services;
using PanoramaMusic.Persistence.Interfaces;

namespace PanoramaMusic.Audit.Infrastructure.Extensions;

public static class ServiceCollectionExtensions
{
	public static IServiceCollection AddAuditInfrastructure(this IServiceCollection services)
	{
		// The repository writes over the scoped IUnitOfWork connection
		// registered by AddInfrastructure, so no context-owned connection
		// factory is needed.
		services.AddTransient<IAuditLogger, AuditEventRepository>();
		services.AddTransient<IAuditEventReader, AuditEventRepository>();
		services.AddTransient<IAuditContext, AuditContext>();
		services.AddTransient<IAuditEventFactory, AuditEventFactory>();
		services.AddTransient<GetAuditEventsHandler>();
		services.AddValidatorsFromAssemblyContaining<GetAuditEventsRequestValidator>();

		// Request-scoped so every repository/handler resolved in one request
		// shares the same collector, and the flush drains everything
		// collected during that request.
		services.AddScoped<IDomainEventCollector, DomainEventCollector>();
		services.AddScoped<IAuditFlushService, AuditFlushService>();
		return services;
	}
}