using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Identity.Application.Commands.Admin;
using PanoramaMusic.Identity.Application.Handlers.Admin;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.ValueObjects;
using PanoramaMusic.Identity.Tests;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Application.Tests;

public class ActivateUserHandlerTests : IClassFixture<IdentityTestFixture>
{
	private readonly IdentityTestContext _context;
	private readonly ActivateUserHandler _handler;

	public ActivateUserHandlerTests(IdentityTestFixture fixture)
	{
		_context = fixture.CreateContext();

		_context.Contexts.UserContextMock
			.SetupGet(u => u.UserId)
			.Returns(Guid.NewGuid());

		_context.Repositories.UserRepositoryMock
			.Setup(r => r.ActivateAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		_handler = _context.ServiceProvider.GetRequiredService<ActivateUserHandler>();
	}

	[Fact]
	[Trait("AC", "M1.1UC33")]
	public async Task HandleAsync_DeactivatedUserExists_CallsActivateAsync()
	{
		var userId = Guid.NewGuid();
		var user = new User(userId, Email.Create("teacher@test.com"), DateTime.UtcNow);

		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(user);

		await _handler.HandleAsync(new ActivateUserCommand(userId), TestContext.Current.CancellationToken);

		_context.Repositories.UserRepositoryMock.Verify(r => r.ActivateAsync(userId, TestContext.Current.CancellationToken), Times.Once);
	}

	[Fact]
	[Trait("AC", "M1.1UC34")]
	public async Task HandleAsync_UserNotFound_ThrowsEntityNotFoundException()
	{
		var userId = Guid.NewGuid();

		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
			.ReturnsAsync((User?)null);

		await Should.ThrowAsync<EntityNotFoundException>(
			() => _handler.HandleAsync(new ActivateUserCommand(userId), TestContext.Current.CancellationToken));

		_context.Repositories.UserRepositoryMock.Verify(r => r.ActivateAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
	}

	[Fact]
	[Trait("AC", "M1.1UC35")]
	public async Task HandleAsync_ActiveUser_ThrowsDomainException()
	{
		var userId = Guid.NewGuid();
		var user = new User(userId, Email.Create("teacher@test.com"), DateTime.UtcNow);
		user.Activate();

		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(user);

		await Should.ThrowAsync<DomainException>(
			() => _handler.HandleAsync(new ActivateUserCommand(userId), TestContext.Current.CancellationToken));

		_context.Repositories.UserRepositoryMock.Verify(r => r.ActivateAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
	}
}