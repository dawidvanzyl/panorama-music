using Microsoft.Extensions.Hosting;
using Moq;
using PanoramaMusic.Audit.Application.Factories;
using PanoramaMusic.Audit.Domain.Interfaces;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Infrastructure.Configurations;
using PanoramaMusic.Identity.Infrastructure.Services;
using PanoramaMusic.Persistence.Transactions;

namespace PanoramaMusic.Identity.Tests;

public sealed class IdentityTestContext
{
	public IdentityTestContext(Func<IdentityTestContext, IServiceProvider> serviceProviderConfig)
	{
		ServiceProvider = serviceProviderConfig(this)
			?? throw new ArgumentNullException(nameof(serviceProviderConfig));
	}

	public AuditMocks Audit { get; } = new AuditMocks();
	public OptionsMocks Options { get; } = new OptionsMocks();
	public ContextMocks Contexts { get; } = new ContextMocks();
	public ServiceMocks Services { get; } = new ServiceMocks();
	public RepositoryMocks Repositories { get; } = new RepositoryMocks();

	public IServiceProvider ServiceProvider { get; }

	public class AuditMocks
	{
		public Mock<IAuditLogger> AuditLoggerMock { get; } = new Mock<IAuditLogger>();
		public Mock<IAuditEventFactory> AuditEventFactoryMock { get; } = new Mock<IAuditEventFactory>();
	}

	public class OptionsMocks
	{
		public Mock<IAppOptions> AppOptionsMock { get; } = new Mock<IAppOptions>();
		public Mock<IAdminOptions> AdminOptionsMock { get; } = new Mock<IAdminOptions>();
		public Mock<ISessionOptions> SessionOptionsMock { get; } = new Mock<ISessionOptions>();
		public HibpOptions HibpOptions { get; } = new HibpOptions { Enabled = true };
		public Mock<JwtOptions> JwtOptionsMock { get; } = new Mock<JwtOptions>();
		public Mock<AdminOptions> AdminSeedOptionsMock { get; } = new Mock<AdminOptions>();
	}

	public class ContextMocks
	{
		public Mock<IUserContext> UserContextMock { get; } = new Mock<IUserContext>();
		public Mock<IClientContext> ClientContextMock { get; } = new Mock<IClientContext>();
		public Mock<IAccessTokenContext> AccessTokenContextMock { get; } = new Mock<IAccessTokenContext>();
	}

	public class ServiceMocks
	{
		public Mock<HttpMessageHandler> HttpMessageHandlerMock { get; } = new Mock<HttpMessageHandler>();
		public Mock<IPasswordHashService> PasswordHashServiceMock { get; } = new Mock<IPasswordHashService>();
		public Mock<IJwtService> JwtServiceMock { get; } = new Mock<IJwtService>();
		public Mock<IEmailService> EmailServiceMock { get; } = new Mock<IEmailService>();
		public Mock<IDenyListPasswordService> DenyListPasswordServiceMock { get; } = new Mock<IDenyListPasswordService>();
		public Mock<IHibpPasswordService> HibpPasswordServiceMock { get; } = new Mock<IHibpPasswordService>();
		public Mock<IHostEnvironment> HostEnvironmentMock { get; } = new Mock<IHostEnvironment>();
	}

	public class RepositoryMocks
	{
		public Mock<IUnitOfWork> UnitOfWorkMock { get; } = new Mock<IUnitOfWork>();
		public Mock<IRevokedAccessTokenRepository> RevokedAccessTokenRepositoryMock { get; } = new Mock<IRevokedAccessTokenRepository>();
		public Mock<IUserRepository> UserRepositoryMock { get; } = new Mock<IUserRepository>();
		public Mock<IInviteTokenRepository> InviteTokenRepositoryMock { get; } = new Mock<IInviteTokenRepository>();
		public Mock<IUserRoleRepository> UserRoleRepositoryMock { get; } = new Mock<IUserRoleRepository>();
		public Mock<IRefreshTokenRepository> RefreshTokenRepositoryMock { get; } = new Mock<IRefreshTokenRepository>();
		public Mock<IPasswordResetTokenRepository> PasswordResetTokenRepositoryMock { get; } = new Mock<IPasswordResetTokenRepository>();
	}
}