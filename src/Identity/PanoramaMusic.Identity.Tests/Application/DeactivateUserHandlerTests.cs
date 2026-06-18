using Moq;
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

public class DeactivateUserHandlerTests
{
	public DeactivateUserHandlerTests()
	{
		UserRepo = new Mock<IUserRepository>();
		AdminOptions = new Mock<IAdminOptions>();
		UserContext = new Mock<IUserContext>();

		AdminOptions.Setup(a => a.SeedAdminEmail).Returns(string.Empty);

		UserRepo
			.Setup(r => r.DeactivateAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		RequestingUserId = Guid.NewGuid();
		UserContext.Setup(u => u.UserId).Returns(RequestingUserId);

		Handler = new DeactivateUserHandler(UserRepo.Object, AdminOptions.Object, UserContext.Object);
	}

	public Mock<IUserRepository> UserRepo { get; }
	public Mock<IAdminOptions> AdminOptions { get; }
	public Mock<IUserContext> UserContext { get; }
	public Guid RequestingUserId { get; }
	public DeactivateUserHandler Handler { get; }

	[Fact]
	[Trait("AC", "M1.1UC16")]
	public async Task HandleAsync_UserExists_CallsDeactivateAsync()
	{
		var userId = Guid.NewGuid();
		var user = new User(userId, Email.Create("teacher@test.com"), DateTime.UtcNow);

		UserRepo
			.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(user);

		await Handler.HandleAsync(new DeactivateUserCommand(userId), TestContext.Current.CancellationToken);

		UserRepo.Verify(r => r.DeactivateAsync(userId, TestContext.Current.CancellationToken), Times.Once);
	}

	[Fact]
	[Trait("AC", "M1.1UC16")]
	public async Task HandleAsync_UserNotFound_ThrowsEntityNotFoundException()
	{
		var userId = Guid.NewGuid();

		UserRepo
			.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
			.ReturnsAsync((User?)null);

		await Should.ThrowAsync<EntityNotFoundException>(
			() => Handler.HandleAsync(new DeactivateUserCommand(userId), TestContext.Current.CancellationToken));

		UserRepo.Verify(r => r.DeactivateAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
	}

	[Fact]
	[Trait("AC", "M1.1UC20")]
	public async Task HandleAsync_SelfDeactivation_ThrowsDomainException()
	{
		await Should.ThrowAsync<DomainException>(
			() => Handler.HandleAsync(new DeactivateUserCommand(RequestingUserId), TestContext.Current.CancellationToken));

		UserRepo.Verify(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
	}

	[Fact]
	[Trait("AC", "M1.1UC21")]
	public async Task HandleAsync_SeedAdmin_ThrowsDomainException()
	{
		var userId = Guid.NewGuid();
		var user = new User(userId, Email.Create("admin@panorama-music.com"), DateTime.UtcNow);

		UserRepo
			.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(user);

		var seedAdminOptions = new Mock<IAdminOptions>();
		seedAdminOptions.Setup(a => a.SeedAdminEmail).Returns("admin@panorama-music.com");
		var handler = new DeactivateUserHandler(UserRepo.Object, seedAdminOptions.Object, UserContext.Object);

		await Should.ThrowAsync<DomainException>(
			() => handler.HandleAsync(new DeactivateUserCommand(userId), TestContext.Current.CancellationToken));

		UserRepo.Verify(r => r.DeactivateAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
	}
}
