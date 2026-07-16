using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Identity.Application.Commands.Admin;
using PanoramaMusic.Identity.Application.Handlers.Admin;
using PanoramaMusic.Identity.Application.Requests.Admin;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Tests;
using PanoramaMusic.Identity.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Application.Tests;

public class CreateUserHandlerTests : IClassFixture<IdentityTestFixture>
{
	private readonly IdentityTestContext _context;
	private readonly CreateUserHandler _handler;

	public CreateUserHandlerTests(IdentityTestFixture fixture)
	{
		_context = fixture.CreateContext();

		_context.Repositories.UserRepositoryMock
			.Setup(r => r.CreateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		_context.Repositories.UserRoleRepositoryMock
			.Setup(r => r.CreateAsync(It.IsAny<UserRole>(), It.IsAny<CancellationToken>()))
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

		_handler = _context.ServiceProvider.GetRequiredService<CreateUserHandler>();
	}

	[Fact]
	[Trait("AC", "M1UC42")]
	public async Task HandleAsync_NewEmail_CreatesUserAndReturnsInviteUrl()
	{
		var userEmail = "new@test.com";

		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByEmailAsync(userEmail, It.IsAny<CancellationToken>()))
			.ReturnsAsync((User?)null);

		var result = await _handler.HandleAsync(
			new CreateUserCommand(new CreateUserRequest(userEmail, [Role.Teacher])),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result
					.ShouldNotBeNull()
					.ShouldSatisfyAllConditions(
						result => result.UserId.ShouldNotBe(Guid.Empty),
						result => result.InviteUrl.ShouldNotBeNullOrEmpty()),
			() => _context.Repositories.UserRepositoryMock.Verify(r => r.CreateAsync(It.IsAny<User>(), TestContext.Current.CancellationToken), Times.Once),
			() => _context.Repositories.UserRoleRepositoryMock.Verify(r => r.CreateAsync(It.Is<UserRole>(ur => ur.Role == Role.Teacher), TestContext.Current.CancellationToken), Times.Once),
			() => _context.Repositories.InviteTokenRepositoryMock.Verify(r => r.CreateAsync(It.IsAny<InviteToken>(), TestContext.Current.CancellationToken), Times.Once));
	}

	[Fact]
	[Trait("AC", "M1UC43")]
	public async Task HandleAsync_ExistingEmail_ThrowsDomainException()
	{
		var userEmail = "existing@test.com";

		var existing = UserFactory.Create(Guid.NewGuid(), userEmail);
		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByEmailAsync(userEmail, It.IsAny<CancellationToken>()))
			.ReturnsAsync(existing);

		await Should.ThrowAsync<DomainException>(
			() => _handler.HandleAsync(
				new CreateUserCommand(new CreateUserRequest(userEmail, [Role.Admin])),
				TestContext.Current.CancellationToken));

		_context.Repositories.UserRepositoryMock.Verify(r => r.CreateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
	}

	[Fact]
	[Trait("AC", "M1.1UC23")]
	public async Task HandleAsync_MultipleRoles_AssignsAllRoles()
	{
		var userEmail = "multi@test.com";
		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByEmailAsync(userEmail, It.IsAny<CancellationToken>()))
			.ReturnsAsync((User?)null);

		await _handler.HandleAsync(
			new CreateUserCommand(new CreateUserRequest(userEmail, [Role.Teacher, Role.Admin])),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => _context.Repositories.UserRoleRepositoryMock.Verify(r => r.CreateAsync(It.Is<UserRole>(ur => ur.Role == Role.Teacher), TestContext.Current.CancellationToken), Times.Once),
			() => _context.Repositories.UserRoleRepositoryMock.Verify(r => r.CreateAsync(It.Is<UserRole>(ur => ur.Role == Role.Admin), TestContext.Current.CancellationToken), Times.Once));
	}
}