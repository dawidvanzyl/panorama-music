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

public class RegenerateInviteTokenHandlerTests
{
	public RegenerateInviteTokenHandlerTests()
	{
		UserRepo = new Mock<IUserRepository>();
		InviteRepo = new Mock<IInviteTokenRepository>();

		InviteRepo
			.Setup(r => r.RevokeAllForUserAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		InviteRepo
			.Setup(r => r.AddAsync(It.IsAny<InviteToken>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		Handler = new RegenerateInviteTokenHandler(UserRepo.Object, InviteRepo.Object);
	}

	public Mock<IUserRepository> UserRepo { get; }
	public Mock<IInviteTokenRepository> InviteRepo { get; }
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
		InviteRepo.Verify(r => r.RevokeAllForUserAsync(user.UserId, TestContext.Current.CancellationToken), Times.Once);
		InviteRepo.Verify(r => r.AddAsync(It.IsAny<InviteToken>(), TestContext.Current.CancellationToken), Times.Once);
	}

	[Fact]
	public async Task HandleAsync_UnknownUser_ThrowsDomainException()
	{
		UserRepo
			.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync((User?)null);

		await Should.ThrowAsync<DomainException>(
			() => Handler.HandleAsync(
				new RegenerateInviteTokenCommand(Guid.NewGuid()),
				TestContext.Current.CancellationToken));

		InviteRepo.Verify(r => r.RevokeAllForUserAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
	}
}