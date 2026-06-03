using Moq;
using PanoramaMusic.Identity.Application;
using PanoramaMusic.Identity.Application.Commands.Auth;
using PanoramaMusic.Identity.Application.Handlers.Auth;
using PanoramaMusic.Identity.Application.Requests.Auth;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Tests.Identity.Application;

public class CompleteRegistrationHandlerTests
{
	private static (
		Mock<IInviteTokenRepository> inviteRepo,
		Mock<IUserRepository> userRepo,
		Mock<IPasswordHasher> hasher,
		CompleteRegistrationHandler handler) CreateSut()
	{
		var inviteRepo = new Mock<IInviteTokenRepository>();
		var userRepo = new Mock<IUserRepository>();
		var hasher = new Mock<IPasswordHasher>();

		userRepo.Setup(r => r.CompleteActivationAsync(It.IsAny<User>(), It.IsAny<Guid>())).Returns(Task.CompletedTask);
		hasher.Setup(h => h.Hash(It.IsAny<string>())).Returns(PasswordHash.Create("$argon2id$v=19$hashed"));

		return (inviteRepo, userRepo, hasher, new CompleteRegistrationHandler(inviteRepo.Object, userRepo.Object, hasher.Object));
	}

	[Fact]
	[Trait("AC", "M1UC32")]
	public async Task HandleAsync_ValidInviteToken_ActivatesUserAndMarksTokenUsed()
	{
		var (inviteRepo, userRepo, _, handler) = CreateSut();
		var rawToken = Guid.NewGuid().ToString();
		var tokenHash = TokenHasher.ComputeSha256Hash(rawToken);
		var userId = Guid.NewGuid();

		var invite = new InviteToken(Guid.NewGuid(), userId, tokenHash, DateTime.UtcNow.AddDays(7));
		inviteRepo.Setup(r => r.GetByTokenHashAsync(tokenHash)).ReturnsAsync(invite);

		var user = new User(userId, Email.Create("u@test.com"), DateTime.UtcNow);
		userRepo.Setup(r => r.GetByIdAsync(userId)).ReturnsAsync(user);

		await handler.HandleAsync(new CompleteRegistrationCommand(new CompleteRegistrationRequest(rawToken, "NewPass123!")));

		invite.IsUsed.ShouldBeTrue();
		user.IsActive.ShouldBeTrue();
		user.PasswordHash.ShouldNotBeNull();
		userRepo.Verify(r => r.CompleteActivationAsync(user, invite.TokenId), Times.Once);
	}

	[Fact]
	[Trait("AC", "M1UC33")]
	public async Task HandleAsync_ExpiredInviteToken_ThrowsDomainException()
	{
		var (inviteRepo, _, _, handler) = CreateSut();
		var rawToken = Guid.NewGuid().ToString();
		var tokenHash = TokenHasher.ComputeSha256Hash(rawToken);
		var userId = Guid.NewGuid();

		var expired = new InviteToken(Guid.NewGuid(), userId, tokenHash, DateTime.UtcNow.AddDays(-1));
		inviteRepo.Setup(r => r.GetByTokenHashAsync(tokenHash)).ReturnsAsync(expired);

		await Should.ThrowAsync<DomainException>(
			() => handler.HandleAsync(new CompleteRegistrationCommand(new CompleteRegistrationRequest(rawToken, "NewPass123!"))));
	}

	[Fact]
	[Trait("AC", "M1UC34")]
	public async Task HandleAsync_AlreadyUsedInviteToken_ThrowsDomainException()
	{
		var (inviteRepo, _, _, handler) = CreateSut();
		var rawToken = Guid.NewGuid().ToString();
		var tokenHash = TokenHasher.ComputeSha256Hash(rawToken);
		var userId = Guid.NewGuid();

		var used = new InviteToken(Guid.NewGuid(), userId, tokenHash, DateTime.UtcNow.AddDays(7));
		used.MarkUsed();
		inviteRepo.Setup(r => r.GetByTokenHashAsync(tokenHash)).ReturnsAsync(used);

		await Should.ThrowAsync<DomainException>(
			() => handler.HandleAsync(new CompleteRegistrationCommand(new CompleteRegistrationRequest(rawToken, "NewPass123!"))));
	}
}