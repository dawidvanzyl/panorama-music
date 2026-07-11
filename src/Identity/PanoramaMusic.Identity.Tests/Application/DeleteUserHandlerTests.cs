using Moq;
using PanoramaMusic.Audit.Application.Factories;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Audit.Domain.Interfaces;
using PanoramaMusic.Identity.Application.Commands.Admin;
using PanoramaMusic.Identity.Application.Handlers.Admin;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Tests.Application;

public class DeleteUserHandlerTests
{
	public DeleteUserHandlerTests()
	{
		UserRepo = new Mock<IUserRepository>();
		AdminOptions = new Mock<IAdminOptions>();
		UserContext = new Mock<IUserContext>();
		AuditLogger = new Mock<IAuditLogger>();
		AuditEventFactory = new Mock<IAuditEventFactory>();

		AdminOptions.Setup(a => a.SeedAdminEmail).Returns(string.Empty);

		UserRepo
			.Setup(r => r.DeleteAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		AuditEventFactory
			.Setup(f => f.Create(
				It.IsAny<string>(), It.IsAny<Guid?>(), It.IsAny<string?>(), It.IsAny<Guid?>(),
				It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<IReadOnlyDictionary<string, object?>?>()))
			.Returns(new AuditEvent(Guid.NewGuid(), DateTime.UtcNow, "test", null, null, null, "127.0.0.1", "test-agent", Guid.NewGuid(), "success", null, new Dictionary<string, object?>()));

		RequestingUserId = Guid.NewGuid();
		UserContext.Setup(u => u.UserId).Returns(RequestingUserId);

		Handler = new DeleteUserHandler(UserRepo.Object, AdminOptions.Object, UserContext.Object, AuditLogger.Object, AuditEventFactory.Object);
	}

	public Mock<IUserRepository> UserRepo { get; }
	public Mock<IAdminOptions> AdminOptions { get; }
	public Mock<IUserContext> UserContext { get; }
	public Mock<IAuditLogger> AuditLogger { get; }
	public Mock<IAuditEventFactory> AuditEventFactory { get; }
	public Guid RequestingUserId { get; }
	public DeleteUserHandler Handler { get; }

	[Fact]
	[Trait("AC", "M1.1UC22")]
	public async Task HandleAsync_DeactivatedUserExists_CallsDeleteAsync()
	{
		var userId = Guid.NewGuid();
		var user = new User(userId, Email.Create("teacher@test.com"), DateTime.UtcNow);

		UserRepo
			.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(user);

		await Handler.HandleAsync(new DeleteUserCommand(userId), TestContext.Current.CancellationToken);

		UserRepo.Verify(r => r.DeleteAsync(userId, TestContext.Current.CancellationToken), Times.Once);
	}

	[Fact]
	[Trait("AC", "M1.1UC23")]
	public async Task HandleAsync_UserNotFound_ThrowsEntityNotFoundException()
	{
		var userId = Guid.NewGuid();

		UserRepo
			.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
			.ReturnsAsync((User?)null);

		await Should.ThrowAsync<EntityNotFoundException>(
			() => Handler.HandleAsync(new DeleteUserCommand(userId), TestContext.Current.CancellationToken));

		UserRepo.Verify(r => r.DeleteAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
	}

	[Fact]
	[Trait("AC", "M1.1UC24")]
	public async Task HandleAsync_SelfDelete_ThrowsDomainException()
	{
		await Should.ThrowAsync<DomainException>(
			() => Handler.HandleAsync(new DeleteUserCommand(RequestingUserId), TestContext.Current.CancellationToken));

		UserRepo.Verify(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
	}

	[Fact]
	[Trait("AC", "M1.1UC25")]
	public async Task HandleAsync_SeedAdmin_ThrowsDomainException()
	{
		var userId = Guid.NewGuid();
		var user = new User(userId, Email.Create("admin@panorama-music.com"), DateTime.UtcNow);

		UserRepo
			.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(user);

		var seedAdminOptions = new Mock<IAdminOptions>();
		seedAdminOptions.Setup(a => a.SeedAdminEmail).Returns("admin@panorama-music.com");
		var handler = new DeleteUserHandler(UserRepo.Object, seedAdminOptions.Object, UserContext.Object, AuditLogger.Object, AuditEventFactory.Object);

		await Should.ThrowAsync<DomainException>(
			() => handler.HandleAsync(new DeleteUserCommand(userId), TestContext.Current.CancellationToken));

		UserRepo.Verify(r => r.DeleteAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
	}

	[Fact]
	[Trait("AC", "M1.1UC26")]
	public async Task HandleAsync_ActiveUser_ThrowsDomainException()
	{
		var userId = Guid.NewGuid();
		var user = new User(userId, Email.Create("teacher@test.com"), DateTime.UtcNow);
		user.Activate();

		UserRepo
			.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(user);

		await Should.ThrowAsync<DomainException>(
			() => Handler.HandleAsync(new DeleteUserCommand(userId), TestContext.Current.CancellationToken));

		UserRepo.Verify(r => r.DeleteAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
	}
}