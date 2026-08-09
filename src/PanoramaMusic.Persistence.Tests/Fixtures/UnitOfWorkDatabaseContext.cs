using Moq;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Infrastructure.Configurations;
using PanoramaMusic.Teachers.Domain.Interfaces;
using IdentityIUserContext = PanoramaMusic.Identity.Application.Interfaces.IUserContext;
using StudentIUserContext = PanoramaMusic.Students.Application.Interfaces.IUserContext;
using TeacherIUserContext = PanoramaMusic.Teachers.Application.Interfaces.IUserContext;

namespace PanoramaMusic.Persistence.Tests.Fixtures;

public sealed class UnitOfWorkDatabaseContext
{
	public UnitOfWorkDatabaseContext(Func<UnitOfWorkDatabaseContext, IServiceProvider> serviceProviderConfig)
	{
		ServiceProvider = serviceProviderConfig(this)
			?? throw new ArgumentNullException(nameof(serviceProviderConfig));
	}

	internal OptionsMocks Options { get; } = new OptionsMocks();
	internal ContextMocks Contexts { get; } = new ContextMocks();
	internal ServiceMocks Services { get; } = new ServiceMocks();
	internal RepositoryMocks Repositories { get; } = new RepositoryMocks();
	internal DirectoryMocks Directories { get; } = new DirectoryMocks();

	public IServiceProvider ServiceProvider { get; }

	internal class OptionsMocks
	{
		internal Mock<IAdminOptions> AdminOptionsMock { get; } = new Mock<IAdminOptions>();
	}

	internal class ContextMocks
	{
		internal Mock<IdentityIUserContext> IdentityIUserContextMock { get; } = new Mock<IdentityIUserContext>();
		internal Mock<StudentIUserContext> StudentUserContextMock { get; } = new Mock<StudentIUserContext>();
		internal Mock<TeacherIUserContext> TeacherUserContextMock { get; } = new Mock<TeacherIUserContext>();
		internal Mock<IClientContext> ClientContextMock { get; } = new Mock<IClientContext>();
		internal Mock<IAuditContext> AuditContextMock { get; } = new Mock<IAuditContext>();
	}

	internal class ServiceMocks
	{
		internal Mock<IPasswordHashService> PasswordHashServiceMock { get; } = new Mock<IPasswordHashService>();
		internal Mock<IJwtService> JwtServiceMock { get; } = new Mock<IJwtService>();
	}

	/// <summary>
	/// Identity implements the Teachers context's account directory in
	/// production. These tests are about what the Teachers writes leave in the
	/// database, not about naming a linked account, so the port is mocked rather
	/// than wiring a second context's infrastructure in behind it.
	/// </summary>
	internal class DirectoryMocks
	{
		internal Mock<IAccountDirectory> AccountDirectoryMock { get; } = new Mock<IAccountDirectory>();
	}

	internal class RepositoryMocks
	{
		internal Mock<IUserRepository> UserRepositoryMock { get; } = new Mock<IUserRepository>();
		internal Mock<IUserRoleRepository> UserRoleRepositoryMock { get; } = new Mock<IUserRoleRepository>();
		internal Mock<IRefreshTokenRepository> RefreshTokenRepositoryMock { get; } = new Mock<IRefreshTokenRepository>();
		internal Mock<IPasswordResetTokenRepository> PasswordResetTokenRepositoryMock { get; } = new Mock<IPasswordResetTokenRepository>();
	}
}