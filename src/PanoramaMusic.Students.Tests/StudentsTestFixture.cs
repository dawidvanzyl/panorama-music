using Microsoft.Extensions.DependencyInjection;
using PanoramaMusic.Students.Application.Handlers;

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
	}
}