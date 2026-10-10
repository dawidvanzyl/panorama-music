using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using PanoramaMusic.Students.Application.Handlers.Courses;
using PanoramaMusic.Students.Application.Handlers.ExtraCurriculars;
using PanoramaMusic.Students.Application.Handlers.GuardianRelationships;
using PanoramaMusic.Students.Application.Handlers.Guardians;
using PanoramaMusic.Students.Application.Handlers.LessonStructures;
using PanoramaMusic.Students.Application.Handlers.Siblings;
using PanoramaMusic.Students.Application.Handlers.StudentCourses;
using PanoramaMusic.Students.Application.Handlers.StudentExtraCurriculars;
using PanoramaMusic.Students.Application.Handlers.Students;
using PanoramaMusic.Students.Application.Handlers.WaitingList;
using PanoramaMusic.Students.Application.Services;
using PanoramaMusic.Students.Application.Validators.Students;

namespace PanoramaMusic.Students.Application.Extensions;

public static class ServiceCollectionExtensions
{
	public static IServiceCollection AddStudentsApplication(this IServiceCollection services)
	{
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
		AddServices(services);

		services.AddValidatorsFromAssemblyContaining<CreateStudentRequestValidator>();

		return services;
	}

	private static void AddStudents(IServiceCollection services)
	{
		services.AddTransient<CreateStudentHandler>();
		services.AddTransient<GetStudentByIdHandler>();
		services.AddTransient<GetStudentsHandler>();
		services.AddTransient<UpdateStudentHandler>();
		services.AddTransient<DeleteStudentHandler>();
	}

	private static void AddSiblings(IServiceCollection services)
	{
		services.AddTransient<AddSiblingHandler>();
		services.AddTransient<GetSiblingsHandler>();
		services.AddTransient<GetSiblingCandidatesHandler>();
		services.AddTransient<RemoveSiblingHandler>();
	}

	private static void AddGuardians(IServiceCollection services)
	{
		services.AddTransient<AddGuardianHandler>();
		services.AddTransient<UpdateGuardianHandler>();
		services.AddTransient<GetGuardiansHandler>();
		services.AddTransient<UnlinkGuardianHandler>();
		services.AddTransient<DeleteGuardianHandler>();
		services.AddTransient<IsGuardianSharedHandler>();
		services.AddTransient<SyncGuardiansHandler>();
		services.AddTransient<GetMissingSiblingGuardiansHandler>();
		services.AddTransient<GetGuardianRelationshipsHandler>();
	}

	private static void AddGuardianRelationships(IServiceCollection services)
	{
		services.AddTransient<CreateGuardianRelationshipHandler>();
		services.AddTransient<RenameGuardianRelationshipHandler>();
		services.AddTransient<DeleteGuardianRelationshipHandler>();
		services.AddTransient<CountGuardianRelationshipHandler>();
	}

	private static void AddLessonStructures(IServiceCollection services)
	{
		services.AddTransient<GetLessonStructuresHandler>();
		services.AddTransient<GetOfferedLessonStructuresHandler>();
	}

	private static void AddCourses(IServiceCollection services)
	{
		services.AddTransient<CreateCourseHandler>();
		services.AddTransient<GetCoursesHandler>();
		services.AddTransient<UpdateCourseCostHandler>();
		services.AddTransient<DeleteCourseHandler>();
		services.AddTransient<CountCourseEnrollmentsHandler>();
	}

	private static void AddStudentCourses(IServiceCollection services)
	{
		services.AddTransient<EnrollStudentHandler>();
		services.AddTransient<GetStudentCoursesHandler>();
		services.AddTransient<UpdateEnrollmentHandler>();
		services.AddTransient<WithdrawEnrollmentHandler>();
	}

	private static void AddExtraCurriculars(IServiceCollection services)
	{
		services.AddTransient<CreateExtraCurricularHandler>();
		services.AddTransient<GetExtraCurricularsHandler>();
		services.AddTransient<UpdateExtraCurricularHandler>();
		services.AddTransient<DeleteExtraCurricularHandler>();
		services.AddTransient<CountExtraCurricularStudentsHandler>();
		services.AddTransient<AddPracticeTimeHandler>();
		services.AddTransient<RemovePracticeTimeHandler>();
	}

	private static void AddStudentExtraCurriculars(IServiceCollection services)
	{
		services.AddTransient<GetStudentExtraCurricularsHandler>();
		services.AddTransient<GetAssignableExtraCurricularsHandler>();
		services.AddTransient<GetAssignableExtraCurricularsByPhaseHandler>();
		services.AddTransient<AssignExtraCurricularHandler>();
		services.AddTransient<RemoveExtraCurricularHandler>();
	}

	private static void AddWaitingList(IServiceCollection services)
	{
		services.AddTransient<GetWaitingListHandler>();
		services.AddTransient<CaptureWaitingListStudentHandler>();
		services.AddTransient<UpdateWaitingListEntryHandler>();
		services.AddTransient<UpdateWaitingListStudentHandler>();
		services.AddTransient<RemoveWaitingListStudentHandler>();
		services.AddTransient<EnrolWaitingListStudentHandler>();
	}

	private static void AddServices(IServiceCollection services)
	{
		services.AddTransient<GuardianMaintenanceScope>();
		services.AddTransient<StudentPopulationResolver>();
	}
}
