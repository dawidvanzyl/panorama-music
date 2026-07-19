using Moq;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Infrastructure.Configurations;
using IdentityIUserContext = PanoramaMusic.Identity.Application.Interfaces.IUserContext;
using StudentIUserContext = PanoramaMusic.Students.Application.Interfaces.IUserContext;

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

	public IServiceProvider ServiceProvider { get; }

	internal class OptionsMocks
	{
		internal Mock<IAdminOptions> AdminOptionsMock { get; } = new Mock<IAdminOptions>();
	}

	internal class ContextMocks
	{
		internal Mock<IdentityIUserContext> IdentityIUserContextMock { get; } = new Mock<IdentityIUserContext>();
		internal Mock<StudentIUserContext> StudentUserContextMock { get; } = new Mock<StudentIUserContext>();
		internal Mock<IClientContext> ClientContextMock { get; } = new Mock<IClientContext>();
		internal Mock<IAuditContext> AuditContextMock { get; } = new Mock<IAuditContext>();
	}

	internal class ServiceMocks
	{
		internal Mock<IPasswordHashService> PasswordHashServiceMock { get; } = new Mock<IPasswordHashService>();
		internal Mock<IJwtService> JwtServiceMock { get; } = new Mock<IJwtService>();
	}

	internal class RepositoryMocks
	{
		internal Mock<IUserRepository> UserRepositoryMock { get; } = new Mock<IUserRepository>();
		internal Mock<IUserRoleRepository> UserRoleRepositoryMock { get; } = new Mock<IUserRoleRepository>();
		internal Mock<IRefreshTokenRepository> RefreshTokenRepositoryMock { get; } = new Mock<IRefreshTokenRepository>();
		internal Mock<IPasswordResetTokenRepository> PasswordResetTokenRepositoryMock { get; } = new Mock<IPasswordResetTokenRepository>();
	}
}