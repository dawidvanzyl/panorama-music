using Moq;
using PanoramaMusic.Audit.Application.Factories;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Audit.Domain.Interfaces;
using PanoramaMusic.Identity.Application.Commands.Admin;
using PanoramaMusic.Identity.Application.Handlers.Admin;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Application.Requests.Admin;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Tests.Application;

public class CreateUserHandlerTests
{
	public CreateUserHandlerTests()
	{
		UserRepo = new Mock<IUserRepository>();
		UserRoleRepo = new Mock<IUserRoleRepository>();
		InviteRepo = new Mock<IInviteTokenRepository>();

		UserRepo
			.Setup(r => r.CreateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		UserRoleRepo
			.Setup(r => r.CreateAsync(It.IsAny<UserRole>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		InviteRepo
			.Setup(r => r.CreateAsync(It.IsAny<InviteToken>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		var appOptions = new Mock<IAppOptions>();
		appOptions.Setup(o => o.AppBaseUrl).Returns(string.Empty);

		UserContext = new Mock<IUserContext>();
		AuditLogger = new Mock<IAuditLogger>();
		AuditEventFactory = new Mock<IAuditEventFactory>();

		UserContext.SetupGet(u => u.UserId).Returns(Guid.NewGuid());

		AuditEventFactory
			.Setup(f => f.Create(
				It.IsAny<string>(), It.IsAny<Guid?>(), It.IsAny<string?>(), It.IsAny<Guid?>(),
				It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<IReadOnlyDictionary<string, object?>?>()))
			.Returns(new AuditEvent(Guid.NewGuid(), DateTime.UtcNow, "test", null, null, null, "127.0.0.1", "test-agent", Guid.NewGuid(), "success", null, new Dictionary<string, object?>()));

		Handler = new CreateUserHandler(UserRepo.Object, UserRoleRepo.Object, InviteRepo.Object, appOptions.Object, UserContext.Object, AuditLogger.Object, AuditEventFactory.Object);
	}

	public Mock<IUserRepository> UserRepo { get; }
	public Mock<IUserRoleRepository> UserRoleRepo { get; }
	public Mock<IInviteTokenRepository> InviteRepo { get; }
	public Mock<IUserContext> UserContext { get; }
	public Mock<IAuditLogger> AuditLogger { get; }
	public Mock<IAuditEventFactory> AuditEventFactory { get; }
	public CreateUserHandler Handler { get; }

	[Fact]
	[Trait("AC", "M1UC42")]
	public async Task HandleAsync_NewEmail_CreatesUserAndReturnsInviteUrl()
	{
		UserRepo
			.Setup(r => r.GetByEmailAsync("new@test.com", It.IsAny<CancellationToken>()))
			.ReturnsAsync((User?)null);

		var result = await Handler.HandleAsync(
			new CreateUserCommand(new CreateUserRequest("new@test.com", [Role.Teacher])),
			TestContext.Current.CancellationToken);

		result.ShouldNotBeNull();
		result.UserId.ShouldNotBe(Guid.Empty);
		result.InviteUrl.ShouldNotBeNullOrEmpty();
		UserRepo.Verify(r => r.CreateAsync(It.IsAny<User>(), TestContext.Current.CancellationToken), Times.Once);
		UserRoleRepo.Verify(r => r.CreateAsync(It.Is<UserRole>(ur => ur.Role == Role.Teacher), TestContext.Current.CancellationToken), Times.Once);
		InviteRepo.Verify(r => r.CreateAsync(It.IsAny<InviteToken>(), TestContext.Current.CancellationToken), Times.Once);
	}

	[Fact]
	[Trait("AC", "M1UC43")]
	public async Task HandleAsync_ExistingEmail_ThrowsDomainException()
	{
		var existing = new User(Guid.NewGuid(), Email.Create("existing@test.com"), DateTime.UtcNow);
		UserRepo
			.Setup(r => r.GetByEmailAsync("existing@test.com", It.IsAny<CancellationToken>()))
			.ReturnsAsync(existing);

		await Should.ThrowAsync<DomainException>(
			() => Handler.HandleAsync(
				new CreateUserCommand(new CreateUserRequest("existing@test.com", [Role.Admin])),
				TestContext.Current.CancellationToken));

		UserRepo.Verify(r => r.CreateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
	}

	[Fact]
	[Trait("AC", "M1.1UC23")]
	public async Task HandleAsync_MultipleRoles_AssignsAllRoles()
	{
		UserRepo
			.Setup(r => r.GetByEmailAsync("multi@test.com", It.IsAny<CancellationToken>()))
			.ReturnsAsync((User?)null);

		await Handler.HandleAsync(
			new CreateUserCommand(new CreateUserRequest("multi@test.com", [Role.Teacher, Role.Admin])),
			TestContext.Current.CancellationToken);

		UserRoleRepo.Verify(r => r.CreateAsync(It.Is<UserRole>(ur => ur.Role == Role.Teacher), TestContext.Current.CancellationToken), Times.Once);
		UserRoleRepo.Verify(r => r.CreateAsync(It.Is<UserRole>(ur => ur.Role == Role.Admin), TestContext.Current.CancellationToken), Times.Once);
	}
}