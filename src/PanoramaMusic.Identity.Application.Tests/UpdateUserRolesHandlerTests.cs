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

public class UpdateUserRolesHandlerTests : IClassFixture<IdentityTestFixture>
{
	private readonly IdentityTestContext _context;
	private readonly Guid _requestingUserId;
	private readonly UpdateUserRolesHandler _handler;

	public UpdateUserRolesHandlerTests(IdentityTestFixture fixture)
	{
		_context = fixture.CreateContext();

		_context.Options.AdminOptionsMock
			.Setup(a => a.SeedAdminEmail)
			.Returns(string.Empty);

		_context.Repositories.UserRoleRepositoryMock
			.Setup(r => r.GetRolesAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync((IList<Role>)[]);

		_requestingUserId = Guid.NewGuid();
		_context.Contexts.UserContextMock
			.Setup(u => u.UserId)
			.Returns(_requestingUserId);

		_handler = _context.ServiceProvider.GetRequiredService<UpdateUserRolesHandler>();
	}

	[Fact]
	[Trait("AC", "M1.1UC12")]
	public async Task HandleAsync_AdminUpdatesRoles_ReturnsUpdatedUser()
	{
		var userId = Guid.NewGuid();
		var user = UserFactory.Create(userId, "teacher@test.com");
		var newRoles = new List<Role> { Role.Teacher, Role.Admin };

		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(user);

		var result = await _handler.HandleAsync(
			new UpdateUserRolesCommand(userId, new UpdateUserRolesRequest(newRoles)),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.ShouldNotBeNull(),
			() => result.UserId.ShouldBe(userId),
			() => result.Roles.ShouldBe(newRoles),
			() => _context.Repositories.UserRoleRepositoryMock.Verify(r => r.SetRolesAsync(userId, newRoles, TestContext.Current.CancellationToken), Times.Once));
	}

	[Fact]
	[Trait("AC", "M1.1UC12")]
	public async Task HandleAsync_UserNotFound_ThrowsEntityNotFoundException()
	{
		var userId = Guid.NewGuid();

		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
			.ReturnsAsync((User?)null);

		await Should.ThrowAsync<EntityNotFoundException>(
			() => _handler.HandleAsync(
				new UpdateUserRolesCommand(userId, new UpdateUserRolesRequest([Role.Teacher])),
				TestContext.Current.CancellationToken));

		_context.Repositories.UserRoleRepositoryMock.Verify(r => r.SetRolesAsync(It.IsAny<Guid>(), It.IsAny<IList<Role>>(), It.IsAny<CancellationToken>()), Times.Never);
	}

	[Fact]
	[Trait("AC", "M1.1UC25")]
	public async Task HandleAsync_SelfEdit_ThrowsDomainException()
	{
		await Should.ThrowAsync<DomainException>(
			() => _handler.HandleAsync(
				new UpdateUserRolesCommand(_requestingUserId, new UpdateUserRolesRequest([Role.Teacher])),
				TestContext.Current.CancellationToken));

		_context.Repositories.UserRepositoryMock.Verify(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
	}

	[Fact]
	[Trait("AC", "M1.1UC26")]
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
			() => _handler.HandleAsync(
				new UpdateUserRolesCommand(userId, new UpdateUserRolesRequest([Role.Teacher])),
				TestContext.Current.CancellationToken));

		_context.Repositories.UserRoleRepositoryMock.Verify(r => r.SetRolesAsync(It.IsAny<Guid>(), It.IsAny<IList<Role>>(), It.IsAny<CancellationToken>()), Times.Never);
	}
}