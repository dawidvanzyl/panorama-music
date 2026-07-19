using Dapper;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Students.Application.Handlers;
using PanoramaMusic.Students.Application.Interfaces;
using PanoramaMusic.Students.Application.Validators;
using PanoramaMusic.Students.Domain.Interfaces;
using PanoramaMusic.Students.Infrastructure.Contexts;
using PanoramaMusic.Students.Infrastructure.Dtos;
using PanoramaMusic.Students.Infrastructure.Repositories;
using PanoramaMusic.Students.Infrastructure.Translators;
using PanoramaMusic.Students.Infrastructure.TypeHandlers;

namespace PanoramaMusic.Students.Infrastructure.Extensions;

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
		dataSourceBuilder.MapComposite<StudentInputDto>("students.student_input");
	}

	public static IServiceCollection AddStudentsInfrastructure(this IServiceCollection services)
	{
		// Dapper has no built-in composite-type<->DbType mapping; process-global and
		// idempotent, so registering it here on every AddStudentsInfrastructure call is safe.
		SqlMapper.AddTypeHandler(new StudentInputTypeHandler());

		services.AddTransient<IStudentRepository, StudentRepository>();
		services.AddScoped<IUserContext, UserContext>();

		services.AddTransient<CreateStudentHandler>();
		services.AddTransient<GetStudentByIdHandler>();
		services.AddTransient<GetStudentsHandler>();
		services.AddTransient<UpdateStudentHandler>();
		services.AddTransient<DeleteStudentHandler>();

		services.AddValidatorsFromAssemblyContaining<CreateStudentRequestValidator>();

		services.AddTransient<IAuditEventTranslator, StudentCreatedTranslator>();
		services.AddTransient<IAuditEventTranslator, StudentUpdatedTranslator>();
		services.AddTransient<IAuditEventTranslator, StudentDeletedTranslator>();

		return services;
	}
}