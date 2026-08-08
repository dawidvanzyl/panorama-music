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

	public DirectoryMocks Directories { get; } = new DirectoryMocks();

	public IServiceProvider ServiceProvider { get; }

	public class RepositoryMocks
	{
		public Mock<ITeacherRepository> TeacherRepositoryMock { get; } = new Mock<ITeacherRepository>();

		public Mock<IBankingDetailsRepository> BankingDetailsRepositoryMock { get; } = new Mock<IBankingDetailsRepository>();
	}

	public class DirectoryMocks
	{
		public Mock<IAccountDirectory> AccountDirectoryMock { get; } = new Mock<IAccountDirectory>();

		public Mock<IBankingActivityLog> BankingActivityLogMock { get; } = new Mock<IBankingActivityLog>();
	}
}