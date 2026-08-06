using Dapper;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Teachers.Application.Handlers.Teachers;
using PanoramaMusic.Teachers.Application.Interfaces;
using PanoramaMusic.Teachers.Application.Validators.Teachers;
using PanoramaMusic.Teachers.Domain.Interfaces;
using PanoramaMusic.Teachers.Infrastructure.Contexts;
using PanoramaMusic.Teachers.Infrastructure.Dtos;
using PanoramaMusic.Teachers.Infrastructure.Repositories;
using PanoramaMusic.Teachers.Infrastructure.Translators.Teachers;
using PanoramaMusic.Teachers.Infrastructure.TypeHandlers;

namespace PanoramaMusic.Teachers.Infrastructure.Extensions;

public static class ServiceCollectionExtensions
{
	/// <summary>
	/// Registers this context's Npgsql composite-type mappings on the shared connection
	/// factory's NpgsqlDataSourceBuilder (see PanoramaMusic.Persistence.Extensions.
	/// ServiceCollectionExtensions.AddInfrastructure's configureDataSource parameter).
	/// Must run before the data source is built, so the caller passes this as a
	/// delegate rather than this context resolving anything from DI.
	/// </summary>
	public static void ConfigureCompositeTypes(NpgsqlDataSourceBuilder dataSourceBuilder)
	{
		dataSourceBuilder.MapComposite<TeacherInputDto>("teachers.teacher_input");
	}

	public static IServiceCollection AddTeachersInfrastructure(this IServiceCollection services)
	{
		// Dapper has no built-in composite-type<->DbType mapping; process-global and
		// idempotent, so registering it here on every AddTeachersInfrastructure call is safe.
		SqlMapper.AddTypeHandler(new TeacherInputTypeHandler());

		services.AddTransient<ITeacherRepository, TeacherRepository>();
		services.AddScoped<IUserContext, UserContext>();

		services.AddTransient<CreateTeacherHandler>();
		services.AddTransient<GetTeacherByIdHandler>();
		services.AddTransient<GetTeachersHandler>();
		services.AddTransient<UpdateTeacherProfileHandler>();
		services.AddTransient<UpdateTeacherClassificationHandler>();

		services.AddValidatorsFromAssemblyContaining<CreateTeacherRequestValidator>();

		services.AddTransient<IAuditEventTranslator, TeacherCreatedTranslator>();
		services.AddTransient<IAuditEventTranslator, TeacherProfileUpdatedTranslator>();
		services.AddTransient<IAuditEventTranslator, TeacherClassificationChangedTranslator>();

		return services;
	}
}