using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using PanoramaMusic.Reporting.Application.Handlers;
using PanoramaMusic.Reporting.Application.Requests;
using PanoramaMusic.Reporting.Application.Services;
using PanoramaMusic.Reporting.Application.Validators;
using PanoramaMusic.Reporting.Domain.Interfaces;
using PanoramaMusic.Reporting.Domain.Registries;
using PanoramaMusic.Reporting.Domain.Services;
using PanoramaMusic.Reporting.Infrastructure.Readers;
using PanoramaMusic.Reporting.Infrastructure.Sql;

namespace PanoramaMusic.Reporting.Infrastructure.Extensions;

public static class ServiceCollectionExtensions
{
	public static IServiceCollection AddReportingInfrastructure(this IServiceCollection services)
	{
		var registry = new StudentFieldRegistry();
		var catalog = new StudentSqlCatalog();

		// The registry and catalog are one allowlist split across two
		// layers — a drift between them is a startup failure, not a runtime
		// surprise a request could trigger.
		RegistryCatalogParity.Validate(registry, catalog);

		services.AddSingleton(registry);
		services.AddSingleton(catalog);
		services.AddSingleton<ReportLayoutBuilder>();

		services.AddSingleton(TimeProvider.System);

		services.AddScoped<IPopulationReader, PopulationReader>();
		// No ICollectionReader is registered — the registry currently
		// declares no non-Student collection. A future reader registers
		// here without changing ReportRunner's dependency shape.
		services.AddScoped<ReportRunner>();

		services.AddScoped<GetReportFieldsHandler>();
		services.AddScoped<RunReportHandler>();

		services.AddScoped<IValidator<RunReportRequest>, RunReportRequestValidator>();

		return services;
	}
}