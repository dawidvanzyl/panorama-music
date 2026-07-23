using Moq;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Tests;

public sealed class StudentsTestContext
{
	public StudentsTestContext(Func<StudentsTestContext, IServiceProvider> serviceProviderConfig)
	{
		ServiceProvider = serviceProviderConfig(this)
			?? throw new ArgumentNullException(nameof(serviceProviderConfig));
	}

	public RepositoryMocks Repositories { get; } = new RepositoryMocks();

	public IServiceProvider ServiceProvider { get; }

	public class RepositoryMocks
	{
		public Mock<IStudentRepository> StudentRepositoryMock { get; } = new Mock<IStudentRepository>();

		public Mock<ISiblingRepository> SiblingRepositoryMock { get; } = new Mock<ISiblingRepository>();
	}
}