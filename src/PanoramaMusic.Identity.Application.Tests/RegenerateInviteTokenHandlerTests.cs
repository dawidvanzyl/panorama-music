using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Identity.Application.Commands.Admin;
using PanoramaMusic.Identity.Application.Handlers.Admin;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Tests;
using PanoramaMusic.Identity.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Application.Tests;

public class RegenerateInviteTokenHandlerTests : IClassFixture<IdentityTestFixture>
{
	private readonly IdentityTestContext _context;
	private readonly RegenerateInviteTokenHandler _handler;

	public RegenerateInviteTokenHandlerTests(IdentityTestFixture fixture)
	{
		_context = fixture.CreateContext();

		_context.Repositories.InviteTokenRepositoryMock
			.Setup(r => r.RevokeForUserAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		_context.Repositories.InviteTokenRepositoryMock
			.Setup(r => r.CreateAsync(It.IsAny<InviteToken>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		_context.Options.AppOptionsMock
			.Setup(o => o.AppBaseUrl)
			.Returns(string.Empty);

		_context.Contexts.UserContextMock
			.SetupGet(u => u.UserId)
			.Returns(Guid.NewGuid());

		_handler = _context.ServiceProvider.GetRequiredService<RegenerateInviteTokenHandler>();
	}

	[Fact]
	[Trait("AC", "M1UC44")]
	public async Task HandleAsync_ExistingUser_RevokesOldTokensAndReturnsNewInviteUrl()
	{
		var userId = Guid.NewGuid();

		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(UserFactory.Create(userId));

		var result = await _handler.HandleAsync(new RegenerateInviteTokenCommand(userId), TestContext.Current.CancellationToken);

		result.ShouldNotBeNull();
		ShouldlyHelpers.Satisfy(
			() => result.InviteUrl.ShouldNotBeNullOrEmpty(),
			() => _context.Repositories.InviteTokenRepositoryMock.Verify(r => r.RevokeForUserAsync(userId, TestContext.Current.CancellationToken), Times.Once),
			() => _context.Repositories.InviteTokenRepositoryMock.Verify(r => r.CreateAsync(It.Is<InviteToken>(t => t.UserId == userId), TestContext.Current.CancellationToken), Times.Once));
	}

	[Fact]
	[Trait("AC", "M1UC45")]
	public async Task HandleAsync_UnknownUser_ThrowsDomainException()
	{
		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync((User?)null);

		await Should.ThrowAsync<DomainException>(
			() => _handler.HandleAsync(new RegenerateInviteTokenCommand(Guid.NewGuid()), TestContext.Current.CancellationToken));

		ShouldlyHelpers.Satisfy(
			() => _context.Repositories.InviteTokenRepositoryMock.Verify(r => r.RevokeForUserAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never),
			() => _context.Repositories.InviteTokenRepositoryMock.Verify(r => r.CreateAsync(It.IsAny<InviteToken>(), It.IsAny<CancellationToken>()), Times.Never));
	}
}