using Dapper;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Teachers.Application.Handlers.Teachers;
using PanoramaMusic.Teachers.Application.Interfaces;
using PanoramaMusic.Teachers.Application.Services;
using PanoramaMusic.Teachers.Application.Validators.Teachers;
using PanoramaMusic.Teachers.Domain.Interfaces;
using PanoramaMusic.Teachers.Domain.Services;
using PanoramaMusic.Teachers.Infrastructure.Contexts;
using PanoramaMusic.Teachers.Infrastructure.Directories;
using PanoramaMusic.Teachers.Infrastructure.Dtos;
using PanoramaMusic.Teachers.Infrastructure.Repositories;
using PanoramaMusic.Teachers.Infrastructure.Translators.Teachers;
using PanoramaMusic.Teachers.Infrastructure.TypeHandlers;
using PanoramaMusic.Teachers.Infrastructure.Validators;

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
		services.AddTransient<TeacherAccountLinkService>();
		services.AddTransient<TeacherResultComposer>();

		// The only place Teachers touches Identity: a port Teachers owns, satisfied
		// by Identity's own repositories rather than by querying its schema.
		services.AddTransient<IAccountDirectory, IdentityAccountDirectory>();

		// Identity owns the contract; the Teachers context supplies the answer, so
		// Identity can refuse to strip the Teacher role from a linked account
		// without knowing what a teacher is.
		services.AddTransient<IRoleRemovalValidator, TeacherLinkRoleRemovalValidator>();

		services.AddTransient<CreateTeacherHandler>();
		services.AddTransient<GetTeacherByIdHandler>();
		services.AddTransient<GetTeachersHandler>();
		services.AddTransient<UpdateTeacherProfileHandler>();
		services.AddTransient<UpdateTeacherClassificationHandler>();
		services.AddTransient<GetLinkableAccountsHandler>();
		services.AddTransient<LinkTeacherAccountHandler>();
		services.AddTransient<UnlinkTeacherAccountHandler>();

		services.AddValidatorsFromAssemblyContaining<CreateTeacherRequestValidator>();

		services.AddTransient<IAuditEventTranslator, TeacherCreatedTranslator>();
		services.AddTransient<IAuditEventTranslator, TeacherProfileUpdatedTranslator>();
		services.AddTransient<IAuditEventTranslator, TeacherClassificationChangedTranslator>();
		services.AddTransient<IAuditEventTranslator, TeacherAccountLinkedTranslator>();
		services.AddTransient<IAuditEventTranslator, TeacherAccountUnlinkedTranslator>();

		return services;
	}
}