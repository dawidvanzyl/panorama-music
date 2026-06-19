using Moq;
using PanoramaMusic.Identity.Application.Commands.Admin;
using PanoramaMusic.Identity.Application.Handlers.Admin;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Tests.Application;

public class ActivateUserHandlerTests
{
	public ActivateUserHandlerTests()
	{
		UserRepo = new Mock<IUserRepository>();

		UserRepo
			.Setup(r => r.ActivateAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		Handler = new ActivateUserHandler(UserRepo.Object);
	}

	public Mock<IUserRepository> UserRepo { get; }
	public ActivateUserHandler Handler { get; }

	[Fact]
	[Trait("AC", "M1.1UC33")]
	public async Task HandleAsync_DeactivatedUserExists_CallsActivateAsync()
	{
		var userId = Guid.NewGuid();
		var user = new User(userId, Email.Create("teacher@test.com"), DateTime.UtcNow);

		UserRepo
			.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(user);

		await Handler.HandleAsync(new ActivateUserCommand(userId), TestContext.Current.CancellationToken);

		UserRepo.Verify(r => r.ActivateAsync(userId, TestContext.Current.CancellationToken), Times.Once);
	}

	[Fact]
	[Trait("AC", "M1.1UC34")]
	public async Task HandleAsync_UserNotFound_ThrowsEntityNotFoundException()
	{
		var userId = Guid.NewGuid();

		UserRepo
			.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
			.ReturnsAsync((User?)null);

		await Should.ThrowAsync<EntityNotFoundException>(
			() => Handler.HandleAsync(new ActivateUserCommand(userId), TestContext.Current.CancellationToken));

		UserRepo.Verify(r => r.ActivateAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
	}

	[Fact]
	[Trait("AC", "M1.1UC35")]
	public async Task HandleAsync_ActiveUser_ThrowsDomainException()
	{
		var userId = Guid.NewGuid();
		var user = new User(userId, Email.Create("teacher@test.com"), DateTime.UtcNow);
		user.Activate();

		UserRepo
			.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(user);

		await Should.ThrowAsync<DomainException>(
			() => Handler.HandleAsync(new ActivateUserCommand(userId), TestContext.Current.CancellationToken));

		UserRepo.Verify(r => r.ActivateAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
	}
}