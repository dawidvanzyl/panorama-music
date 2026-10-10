using Dapper;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Infrastructure.TypeHandlers;
using PanoramaMusic.Students.Domain.Interfaces;
using PanoramaMusic.Teachers.Application.Interfaces;
using PanoramaMusic.Teachers.Domain.Interfaces;
using PanoramaMusic.Teachers.Infrastructure.Contexts;
using PanoramaMusic.Teachers.Infrastructure.Directories;
using PanoramaMusic.Teachers.Infrastructure.Dtos;
using PanoramaMusic.Teachers.Infrastructure.Repositories;
using PanoramaMusic.Teachers.Infrastructure.Translators.Banking;
using PanoramaMusic.Teachers.Infrastructure.Translators.Teachers;
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
		SqlMapper.AddTypeHandler(new InputTypeHandler<TeacherInputDto>());

		AddContexts(services);
		AddTeachers(services);
		AddBanking(services);
		AddCrossContextPorts(services);

		return services;
	}

	private static void AddContexts(IServiceCollection services)
	{
		services.AddScoped<IUserContext, UserContext>();
	}

	private static void AddTeachers(IServiceCollection services)
	{
		services.AddTransient<ITeacherRepository, TeacherRepository>();

		services.AddTransient<IAuditEventTranslator, TeacherCreatedTranslator>();
		services.AddTransient<IAuditEventTranslator, TeacherProfileUpdatedTranslator>();
		services.AddTransient<IAuditEventTranslator, TeacherClassificationChangedTranslator>();
		services.AddTransient<IAuditEventTranslator, TeacherAccountLinkedTranslator>();
		services.AddTransient<IAuditEventTranslator, TeacherAccountUnlinkedTranslator>();
		services.AddTransient<IAuditEventTranslator, TeacherDeactivatedTranslator>();
		services.AddTransient<IAuditEventTranslator, TeacherReactivatedTranslator>();
		services.AddTransient<IAuditEventTranslator, TeacherDeletedTranslator>();
	}

	private static void AddBanking(IServiceCollection services)
	{
		services.AddTransient<IBankingDetailsRepository, BankingDetailsRepository>();
		services.AddTransient<IBankingActivityLog, AuditBankingActivityLog>();

		services.AddTransient<IAuditEventTranslator, BankingDetailsAmendedTranslator>();
		services.AddTransient<IAuditEventTranslator, BankingDetailsCapturedTranslator>();
		services.AddTransient<IAuditEventTranslator, BankingDetailsDeletedTranslator>();
		services.AddTransient<IAuditEventTranslator, BankingDetailsRevealedTranslator>();
	}

	private static void AddCrossContextPorts(IServiceCollection services)
	{
		// Identity owns the contract; the Teachers context supplies the answer, so
		// Identity can refuse to strip the Teacher role from a linked account
		// without knowing what a teacher is.
		services.AddTransient<IRoleRemovalValidator, TeacherLinkRoleRemovalValidator>();

		// Students owns the contract; the Teachers context supplies the answer, so
		// an enrollment can name the teacher it assigns without the Students
		// context knowing how a teacher is stored.
		services.AddTransient<ITeacherDirectory, StudentsTeacherDirectory>();
	}
}