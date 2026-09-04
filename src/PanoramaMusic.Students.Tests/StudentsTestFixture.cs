using Microsoft.Extensions.DependencyInjection;
using PanoramaMusic.Students.Application.Handlers.Courses;
using PanoramaMusic.Students.Application.Handlers.ExtraCurriculars;
using PanoramaMusic.Students.Application.Handlers.GuardianRelationships;
using PanoramaMusic.Students.Application.Handlers.Guardians;
using PanoramaMusic.Students.Application.Handlers.Siblings;
using PanoramaMusic.Students.Application.Handlers.StudentCourses;
using PanoramaMusic.Students.Application.Handlers.StudentExtraCurriculars;
using PanoramaMusic.Students.Application.Handlers.Students;
using PanoramaMusic.Students.Application.Handlers.WaitingList;
using PanoramaMusic.Students.Application.Services;

namespace PanoramaMusic.Students.Tests;

public sealed class StudentsTestFixture
{
	public StudentsTestContext CreateContext()
	{
		return new StudentsTestContext(context =>
		{
			var services = new ServiceCollection();

			RegisterRepositories(services, context);
			RegisterHandlers(services);

			return services.BuildServiceProvider();
		});
	}

	private static void RegisterRepositories(ServiceCollection services, StudentsTestContext context)
	{
		services.AddTransient(sp => context.Repositories.StudentRepositoryMock.Object);
		services.AddTransient(sp => context.Repositories.SiblingRepositoryMock.Object);
		services.AddTransient(sp => context.Repositories.GuardianRepositoryMock.Object);
		services.AddTransient(sp => context.Repositories.StudentGuardianRepositoryMock.Object);
		services.AddTransient(sp => context.Repositories.GuardianRelationshipRepositoryMock.Object);
		services.AddTransient(sp => context.Repositories.LessonStructureRepositoryMock.Object);
		services.AddTransient(sp => context.Repositories.CourseRepositoryMock.Object);
		services.AddTransient(sp => context.Repositories.StudentCourseRepositoryMock.Object);
		services.AddTransient(sp => context.Repositories.ExtraCurricularRepositoryMock.Object);
		services.AddTransient(sp => context.Repositories.StudentExtraCurricularRepositoryMock.Object);
		services.AddTransient(sp => context.Repositories.WaitingListRepositoryMock.Object);
		services.AddTransient(sp => context.Repositories.TeacherDirectoryMock.Object);
		services.AddTransient(sp => context.UserContextMock.Object);
		services.AddTransient<GuardianMaintenanceScope>();
		services.AddTransient<StudentWriteSourceResolver>();
	}

	private static void RegisterHandlers(ServiceCollection services)
	{
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
		services.AddTransient<GetWaitingListHandler>();
		services.AddTransient<CaptureWaitingListStudentHandler>();
		services.AddTransient<UpdateWaitingListEntryHandler>();
		services.AddTransient<UpdateWaitingListStudentHandler>();
		services.AddTransient<RemoveWaitingListStudentHandler>();
	}
}