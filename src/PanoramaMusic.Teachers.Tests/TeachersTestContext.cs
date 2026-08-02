using Moq;
using PanoramaMusic.Teachers.Domain.Interfaces;

namespace PanoramaMusic.Teachers.Tests;

public sealed class TeachersTestContext
{
	public TeachersTestContext(Func<TeachersTestContext, IServiceProvider> serviceProviderConfig)
	{
		ServiceProvider = serviceProviderConfig(this)
			?? throw new ArgumentNullException(nameof(serviceProviderConfig));
	}

	public RepositoryMocks Repositories { get; } = new RepositoryMocks();

	public IServiceProvider ServiceProvider { get; }

	public class RepositoryMocks
	{
		public Mock<ITeacherRepository> TeacherRepositoryMock { get; } = new Mock<ITeacherRepository>();
	}
}