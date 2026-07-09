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

public class RegenerateInviteTokenHandlerTests
{
	public RegenerateInviteTokenHandlerTests()
	{
		UserRepo = new Mock<IUserRepository>();
		InviteRepo = new Mock<IInviteTokenRepository>();

		InviteRepo
			.Setup(r => r.RevokeForUserAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
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

		Handler = new RegenerateInviteTokenHandler(UserRepo.Object, InviteRepo.Object, appOptions.Object, UserContext.Object, AuditLogger.Object, AuditEventFactory.Object);
	}

	public Mock<IUserRepository> UserRepo { get; }
	public Mock<IInviteTokenRepository> InviteRepo { get; }
	public Mock<IUserContext> UserContext { get; }
	public Mock<IAuditLogger> AuditLogger { get; }
	public Mock<IAuditEventFactory> AuditEventFactory { get; }
	public RegenerateInviteTokenHandler Handler { get; }

	[Fact]
	[Trait("AC", "M1UC44")]
	public async Task HandleAsync_ExistingUser_RevokesOldTokensAndReturnsNewInviteUrl()
	{
		var user = new User(Guid.NewGuid(), Email.Create("user@test.com"), DateTime.UtcNow);
		UserRepo
			.Setup(r => r.GetByIdAsync(user.UserId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(user);

		var result = await Handler.HandleAsync(
			new RegenerateInviteTokenCommand(user.UserId),
			TestContext.Current.CancellationToken);

		result.ShouldNotBeNull();
		result.InviteUrl.ShouldNotBeNullOrEmpty();
		InviteRepo.Verify(r => r.RevokeForUserAsync(user.UserId, TestContext.Current.CancellationToken), Times.Once);
		InviteRepo.Verify(r => r.CreateAsync(It.Is<InviteToken>(t => t.UserId == user.UserId), TestContext.Current.CancellationToken), Times.Once);
	}

	[Fact]
	[Trait("AC", "M1UC45")]
	public async Task HandleAsync_UnknownUser_ThrowsDomainException()
	{
		UserRepo
			.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync((User?)null);

		await Should.ThrowAsync<DomainException>(
			() => Handler.HandleAsync(
				new RegenerateInviteTokenCommand(Guid.NewGuid()),
				TestContext.Current.CancellationToken));

		InviteRepo.Verify(r => r.RevokeForUserAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
		InviteRepo.Verify(r => r.CreateAsync(It.IsAny<InviteToken>(), It.IsAny<CancellationToken>()), Times.Never);
	}
}