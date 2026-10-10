using Dapper;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Infrastructure.TypeHandlers;
using PanoramaMusic.Students.Application.Interfaces;
using PanoramaMusic.Students.Domain.Interfaces;
using PanoramaMusic.Students.Infrastructure.Contexts;
using PanoramaMusic.Students.Infrastructure.Dtos;
using PanoramaMusic.Students.Infrastructure.Repositories;
using PanoramaMusic.Students.Infrastructure.Translators.Courses;
using PanoramaMusic.Students.Infrastructure.Translators.ExtraCurriculars;
using PanoramaMusic.Students.Infrastructure.Translators.GuardianRelationships;
using PanoramaMusic.Students.Infrastructure.Translators.Guardians;
using PanoramaMusic.Students.Infrastructure.Translators.Siblings;
using PanoramaMusic.Students.Infrastructure.Translators.StudentCourses;
using PanoramaMusic.Students.Infrastructure.Translators.StudentExtraCurriculars;
using PanoramaMusic.Students.Infrastructure.Translators.Students;
using PanoramaMusic.Students.Infrastructure.Translators.WaitingList;
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
		SqlMapper.AddTypeHandler(new InputTypeHandler<StudentInputDto>());
		SqlMapper.AddTypeHandler(new TimeOnlyTypeHandler());

		AddContexts(services);
		AddStudents(services);
		AddSiblings(services);
		AddGuardians(services);
		AddGuardianRelationships(services);
		AddLessonStructures(services);
		AddCourses(services);
		AddStudentCourses(services);
		AddExtraCurriculars(services);
		AddStudentExtraCurriculars(services);
		AddWaitingList(services);

		return services;
	}

	private static void AddContexts(IServiceCollection services)
	{
		services.AddScoped<IUserContext, UserContext>();
	}

	private static void AddStudents(IServiceCollection services)
	{
		services.AddTransient<IStudentRepository, StudentRepository>();

		services.AddTransient<IAuditEventTranslator, StudentCreatedTranslator>();
		services.AddTransient<IAuditEventTranslator, StudentUpdatedTranslator>();
		services.AddTransient<IAuditEventTranslator, StudentDeletedTranslator>();
	}

	private static void AddSiblings(IServiceCollection services)
	{
		services.AddTransient<ISiblingRepository, SiblingRepository>();

		services.AddTransient<IAuditEventTranslator, SiblingAddedTranslator>();
		services.AddTransient<IAuditEventTranslator, SiblingRemovedTranslator>();
	}

	private static void AddGuardians(IServiceCollection services)
	{
		services.AddTransient<IGuardianRepository, GuardianRepository>();
		services.AddTransient<IStudentGuardianRepository, StudentGuardianRepository>();

		services.AddTransient<IAuditEventTranslator, GuardianCreatedTranslator>();
		services.AddTransient<IAuditEventTranslator, GuardianUpdatedTranslator>();
		services.AddTransient<IAuditEventTranslator, GuardianDeletedTranslator>();
		services.AddTransient<IAuditEventTranslator, GuardianLinkedTranslator>();
		services.AddTransient<IAuditEventTranslator, GuardianUnlinkedTranslator>();
	}

	private static void AddGuardianRelationships(IServiceCollection services)
	{
		services.AddTransient<IGuardianRelationshipRepository, GuardianRelationshipRepository>();

		services.AddTransient<IAuditEventTranslator, GuardianRelationshipCreatedTranslator>();
		services.AddTransient<IAuditEventTranslator, GuardianRelationshipRenamedTranslator>();
		services.AddTransient<IAuditEventTranslator, GuardianRelationshipDeletedTranslator>();
	}

	private static void AddLessonStructures(IServiceCollection services)
	{
		services.AddTransient<ILessonStructureRepository, LessonStructureRepository>();
	}

	private static void AddCourses(IServiceCollection services)
	{
		services.AddTransient<ICourseRepository, CourseRepository>();

		services.AddTransient<IAuditEventTranslator, CourseCreatedTranslator>();
		services.AddTransient<IAuditEventTranslator, CourseCostUpdatedTranslator>();
		services.AddTransient<IAuditEventTranslator, CourseDeletedTranslator>();
	}

	private static void AddStudentCourses(IServiceCollection services)
	{
		services.AddTransient<IStudentCourseRepository, StudentCourseRepository>();

		services.AddTransient<IAuditEventTranslator, StudentEnrolledTranslator>();
		services.AddTransient<IAuditEventTranslator, StudentEnrollmentUpdatedTranslator>();
		services.AddTransient<IAuditEventTranslator, StudentWithdrawnTranslator>();
	}

	private static void AddExtraCurriculars(IServiceCollection services)
	{
		services.AddTransient<IExtraCurricularRepository, ExtraCurricularRepository>();

		services.AddTransient<IAuditEventTranslator, ExtraCurricularCreatedTranslator>();
		services.AddTransient<IAuditEventTranslator, ExtraCurricularUpdatedTranslator>();
		services.AddTransient<IAuditEventTranslator, ExtraCurricularDeletedTranslator>();
		services.AddTransient<IAuditEventTranslator, ExtraCurricularPracticeTimeAddedTranslator>();
		services.AddTransient<IAuditEventTranslator, ExtraCurricularPracticeTimeRemovedTranslator>();
	}

	private static void AddStudentExtraCurriculars(IServiceCollection services)
	{
		services.AddTransient<IStudentExtraCurricularRepository, StudentExtraCurricularRepository>();

		services.AddTransient<IAuditEventTranslator, StudentAssignedToExtraCurricularTranslator>();
		services.AddTransient<IAuditEventTranslator, StudentRemovedFromExtraCurricularTranslator>();
	}

	private static void AddWaitingList(IServiceCollection services)
	{
		services.AddTransient<IWaitingListRepository, WaitingListRepository>();

		services.AddTransient<IAuditEventTranslator, WaitingListEntryCreatedTranslator>();
		services.AddTransient<IAuditEventTranslator, WaitingListEntryUpdatedTranslator>();
		services.AddTransient<IAuditEventTranslator, WaitingListEntryRemovedTranslator>();
		services.AddTransient<IAuditEventTranslator, WaitingListEntryEnrolledTranslator>();
	}
}