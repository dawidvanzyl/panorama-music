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

public class DeleteUserHandlerTests : IClassFixture<IdentityTestFixture>
{
	private readonly IdentityTestContext _context;
	private readonly Guid _requestingUserId;
	private readonly DeleteUserHandler _handler;

	public DeleteUserHandlerTests(IdentityTestFixture fixture)
	{
		_context = fixture.CreateContext();

		_context.Options.AdminOptionsMock
			.Setup(a => a.SeedAdminEmail)
			.Returns(string.Empty);

		_context.Repositories.UserRepositoryMock
			.Setup(r => r.DeleteAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		_requestingUserId = Guid.NewGuid();
		_context.Contexts.UserContextMock
			.Setup(u => u.UserId)
			.Returns(_requestingUserId);

		_handler = _context.ServiceProvider.GetRequiredService<DeleteUserHandler>();
	}

	[Fact]
	[Trait("AC", "M1.1UC22")]
	public async Task HandleAsync_DeactivatedUserExists_CallsDeleteAsync()
	{
		var userId = Guid.NewGuid();

		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(UserFactory.Create(userId, "teacher@test.com"));

		await _handler.HandleAsync(new DeleteUserCommand(userId), TestContext.Current.CancellationToken);

		_context.Repositories.UserRepositoryMock.Verify(r => r.DeleteAsync(userId, TestContext.Current.CancellationToken), Times.Once);
	}

	[Fact]
	[Trait("AC", "M1.1UC23")]
	public async Task HandleAsync_UserNotFound_ThrowsEntityNotFoundException()
	{
		var userId = Guid.NewGuid();

		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
			.ReturnsAsync((User?)null);

		await Should.ThrowAsync<EntityNotFoundException>(
			() => _handler.HandleAsync(new DeleteUserCommand(userId), TestContext.Current.CancellationToken));

		_context.Repositories.UserRepositoryMock.Verify(r => r.DeleteAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
	}

	[Fact]
	[Trait("AC", "M1.1UC24")]
	public async Task HandleAsync_SelfDelete_ThrowsDomainException()
	{
		await Should.ThrowAsync<DomainException>(
			() => _handler.HandleAsync(new DeleteUserCommand(_requestingUserId), TestContext.Current.CancellationToken));

		_context.Repositories.UserRepositoryMock.Verify(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
	}

	[Fact]
	[Trait("AC", "M1.1UC25")]
	public async Task HandleAsync_SeedAdmin_ThrowsDomainException()
	{
		var userId = Guid.NewGuid();
		const string adminEmail = "admin@panorama-music.com";

		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(UserFactory.Create(userId, adminEmail));

		_context.Options.AdminOptionsMock
			.Setup(a => a.SeedAdminEmail)
			.Returns(adminEmail);

		await Should.ThrowAsync<DomainException>(
			() => _handler.HandleAsync(new DeleteUserCommand(userId), TestContext.Current.CancellationToken));

		_context.Repositories.UserRepositoryMock.Verify(r => r.DeleteAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
	}

	[Fact]
	[Trait("AC", "M1.1UC26")]
	public async Task HandleAsync_ActiveUser_ThrowsDomainException()
	{
		var userId = Guid.NewGuid();

		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(UserFactory.CreateActive(userId, "teacher@test.com"));

		await Should.ThrowAsync<DomainException>(
			() => _handler.HandleAsync(new DeleteUserCommand(userId), TestContext.Current.CancellationToken));

		_context.Repositories.UserRepositoryMock.Verify(r => r.DeleteAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
	}
}