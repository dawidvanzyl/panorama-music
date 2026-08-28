using Dapper;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Students.Application.Handlers.Courses;
using PanoramaMusic.Students.Application.Handlers.ExtraCurriculars;
using PanoramaMusic.Students.Application.Handlers.GuardianRelationships;
using PanoramaMusic.Students.Application.Handlers.Guardians;
using PanoramaMusic.Students.Application.Handlers.LessonStructures;
using PanoramaMusic.Students.Application.Handlers.Siblings;
using PanoramaMusic.Students.Application.Handlers.StudentCourses;
using PanoramaMusic.Students.Application.Handlers.StudentExtraCurriculars;
using PanoramaMusic.Students.Application.Handlers.Students;
using PanoramaMusic.Students.Application.Interfaces;
using PanoramaMusic.Students.Application.Validators.Students;
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
		SqlMapper.AddTypeHandler(new TimeOnlyTypeHandler());

		services.AddTransient<IStudentRepository, StudentRepository>();
		services.AddTransient<ISiblingRepository, SiblingRepository>();
		services.AddTransient<IGuardianRepository, GuardianRepository>();
		services.AddTransient<IStudentGuardianRepository, StudentGuardianRepository>();
		services.AddTransient<IGuardianRelationshipRepository, GuardianRelationshipRepository>();
		services.AddTransient<ILessonStructureRepository, LessonStructureRepository>();
		services.AddTransient<ICourseRepository, CourseRepository>();
		services.AddTransient<IStudentCourseRepository, StudentCourseRepository>();
		services.AddTransient<IExtraCurricularRepository, ExtraCurricularRepository>();
		services.AddTransient<IStudentExtraCurricularRepository, StudentExtraCurricularRepository>();
		services.AddScoped<IUserContext, UserContext>();

		services.AddTransient<CreateStudentHandler>();
		services.AddTransient<GetStudentByIdHandler>();
		services.AddTransient<GetStudentsHandler>();
		services.AddTransient<UpdateStudentHandler>();
		services.AddTransient<DeleteStudentHandler>();
		services.AddTransient<AddSiblingHandler>();
		services.AddTransient<GetSiblingsHandler>();
		services.AddTransient<RemoveSiblingHandler>();
		services.AddTransient<AddGuardianHandler>();
		services.AddTransient<UpdateGuardianHandler>();
		services.AddTransient<GetGuardiansHandler>();
		services.AddTransient<UnlinkGuardianHandler>();
		services.AddTransient<DeleteGuardianHandler>();
		services.AddTransient<IsGuardianSharedHandler>();
		services.AddTransient<SyncGuardiansHandler>();
		services.AddTransient<GetMissingSiblingGuardiansHandler>();
		services.AddTransient<GetGuardianRelationshipsHandler>();
		services.AddTransient<CreateGuardianRelationshipHandler>();
		services.AddTransient<RenameGuardianRelationshipHandler>();
		services.AddTransient<DeleteGuardianRelationshipHandler>();
		services.AddTransient<CountGuardianRelationshipHandler>();
		services.AddTransient<GetLessonStructuresHandler>();
		services.AddTransient<CreateCourseHandler>();
		services.AddTransient<GetCoursesHandler>();
		services.AddTransient<UpdateCourseCostHandler>();
		services.AddTransient<DeleteCourseHandler>();
		services.AddTransient<CountCourseEnrollmentsHandler>();
		services.AddTransient<EnrollStudentHandler>();
		services.AddTransient<GetStudentCoursesHandler>();
		services.AddTransient<UpdateEnrollmentHandler>();
		services.AddTransient<WithdrawEnrollmentHandler>();
		services.AddTransient<CreateExtraCurricularHandler>();
		services.AddTransient<GetExtraCurricularsHandler>();
		services.AddTransient<UpdateExtraCurricularHandler>();
		services.AddTransient<DeleteExtraCurricularHandler>();
		services.AddTransient<CountExtraCurricularStudentsHandler>();
		services.AddTransient<AddPracticeTimeHandler>();
		services.AddTransient<RemovePracticeTimeHandler>();
		services.AddTransient<GetStudentExtraCurricularsHandler>();
		services.AddTransient<GetAssignableExtraCurricularsHandler>();
		services.AddTransient<GetAssignableExtraCurricularsByPhaseHandler>();
		services.AddTransient<AssignExtraCurricularHandler>();
		services.AddTransient<RemoveExtraCurricularHandler>();

		services.AddValidatorsFromAssemblyContaining<CreateStudentRequestValidator>();

		services.AddTransient<IAuditEventTranslator, StudentCreatedTranslator>();
		services.AddTransient<IAuditEventTranslator, StudentUpdatedTranslator>();
		services.AddTransient<IAuditEventTranslator, StudentDeletedTranslator>();
		services.AddTransient<IAuditEventTranslator, SiblingAddedTranslator>();
		services.AddTransient<IAuditEventTranslator, SiblingRemovedTranslator>();
		services.AddTransient<IAuditEventTranslator, GuardianCreatedTranslator>();
		services.AddTransient<IAuditEventTranslator, GuardianUpdatedTranslator>();
		services.AddTransient<IAuditEventTranslator, GuardianDeletedTranslator>();
		services.AddTransient<IAuditEventTranslator, GuardianLinkedTranslator>();
		services.AddTransient<IAuditEventTranslator, GuardianUnlinkedTranslator>();
		services.AddTransient<IAuditEventTranslator, GuardianRelationshipCreatedTranslator>();
		services.AddTransient<IAuditEventTranslator, GuardianRelationshipRenamedTranslator>();
		services.AddTransient<IAuditEventTranslator, GuardianRelationshipDeletedTranslator>();
		services.AddTransient<IAuditEventTranslator, CourseCreatedTranslator>();
		services.AddTransient<IAuditEventTranslator, CourseCostUpdatedTranslator>();
		services.AddTransient<IAuditEventTranslator, CourseDeletedTranslator>();
		services.AddTransient<IAuditEventTranslator, StudentEnrolledTranslator>();
		services.AddTransient<IAuditEventTranslator, StudentEnrollmentUpdatedTranslator>();
		services.AddTransient<IAuditEventTranslator, StudentWithdrawnTranslator>();
		services.AddTransient<IAuditEventTranslator, ExtraCurricularCreatedTranslator>();
		services.AddTransient<IAuditEventTranslator, ExtraCurricularUpdatedTranslator>();
		services.AddTransient<IAuditEventTranslator, ExtraCurricularDeletedTranslator>();
		services.AddTransient<IAuditEventTranslator, ExtraCurricularPracticeTimeAddedTranslator>();
		services.AddTransient<IAuditEventTranslator, ExtraCurricularPracticeTimeRemovedTranslator>();
		services.AddTransient<IAuditEventTranslator, StudentAssignedToExtraCurricularTranslator>();
		services.AddTransient<IAuditEventTranslator, StudentRemovedFromExtraCurricularTranslator>();

		return services;
	}
}