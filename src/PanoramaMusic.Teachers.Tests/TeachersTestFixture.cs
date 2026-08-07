using Microsoft.Extensions.DependencyInjection;
using PanoramaMusic.Teachers.Application.Handlers.Teachers;
using PanoramaMusic.Teachers.Domain.Services;

namespace PanoramaMusic.Teachers.Tests;

public sealed class TeachersTestFixture
{
	public TeachersTestContext CreateContext()
	{
		return new TeachersTestContext(context =>
		{
			var services = new ServiceCollection();

			RegisterRepositories(services, context);
			RegisterServices(services);
			RegisterHandlers(services);

			return services.BuildServiceProvider();
		});
	}

	private static void RegisterRepositories(ServiceCollection services, TeachersTestContext context)
	{
		services.AddTransient(sp => context.Repositories.TeacherRepositoryMock.Object);
	}

	private static void RegisterServices(ServiceCollection services)
	{
		services.AddTransient<TeacherAccountLinkService>();
	}

	private static void RegisterHandlers(ServiceCollection services)
	{
		services.AddTransient<CreateTeacherHandler>();
		services.AddTransient<GetTeacherByIdHandler>();
		services.AddTransient<GetTeachersHandler>();
		services.AddTransient<UpdateTeacherProfileHandler>();
		services.AddTransient<UpdateTeacherClassificationHandler>();
		services.AddTransient<GetLinkableAccountsHandler>();
		services.AddTransient<LinkTeacherAccountHandler>();
		services.AddTransient<UnlinkTeacherAccountHandler>();
	}
}