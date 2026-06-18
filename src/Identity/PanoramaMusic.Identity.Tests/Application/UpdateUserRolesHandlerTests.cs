using Moq;
using PanoramaMusic.Identity.Application;
using PanoramaMusic.Identity.Application.Commands.Admin;
using PanoramaMusic.Identity.Application.Handlers.Admin;
using PanoramaMusic.Identity.Application.Requests.Admin;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;
using Shouldly;
using System.Security.Claims;
using Xunit;

namespace PanoramaMusic.Identity.Tests.Application;

public class UpdateUserRolesHandlerTests
{
	public UpdateUserRolesHandlerTests()
	{
		UserRepo = new Mock<IUserRepository>();
		UserRoleRepo = new Mock<IUserRoleRepository>();
		AdminOptions = new Mock<IAdminOptions>();

		AdminOptions.Setup(a => a.SeedAdminEmail).Returns(string.Empty);

		UserRoleRepo
			.Setup(r => r.SetRolesAsync(It.IsAny<Guid>(), It.IsAny<IList<Role>>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		RequestingUserId = Guid.NewGuid();
		CurrentUser = new ClaimsPrincipal(new ClaimsIdentity([new Claim("sub", RequestingUserId.ToString())]));
		Handler = new UpdateUserRolesHandler(UserRepo.Object, UserRoleRepo.Object, AdminOptions.Object, CurrentUser);
	}

	public Mock<IUserRepository> UserRepo { get; }
	public Mock<IUserRoleRepository> UserRoleRepo { get; }
	public Mock<IAdminOptions> AdminOptions { get; }
	public Guid RequestingUserId { get; }
	public ClaimsPrincipal CurrentUser { get; }
	public UpdateUserRolesHandler Handler { get; }

	[Fact]
	[Trait("AC", "M1.1UC12")]
	public async Task HandleAsync_AdminUpdatesRoles_ReturnsUpdatedUser()
	{
		var userId = Guid.NewGuid();
		var user = new User(userId, Email.Create("teacher@test.com"), DateTime.UtcNow);
		var newRoles = new List<Role> { Role.Teacher, Role.Admin };

		UserRepo
			.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(user);

		var result = await Handler.HandleAsync(
			new UpdateUserRolesCommand(userId, new UpdateUserRolesRequest(newRoles)),
			TestContext.Current.CancellationToken);

		result.ShouldNotBeNull();
		result.UserId.ShouldBe(userId);
		result.Roles.ShouldBe(newRoles);
		UserRoleRepo.Verify(r => r.SetRolesAsync(userId, newRoles, TestContext.Current.CancellationToken), Times.Once);
	}

	[Fact]
	[Trait("AC", "M1.1UC12")]
	public async Task HandleAsync_UserNotFound_ThrowsEntityNotFoundException()
	{
		var userId = Guid.NewGuid();

		UserRepo
			.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
			.ReturnsAsync((User?)null);

		await Should.ThrowAsync<EntityNotFoundException>(
			() => Handler.HandleAsync(
				new UpdateUserRolesCommand(userId, new UpdateUserRolesRequest([Role.Teacher])),
				TestContext.Current.CancellationToken));

		UserRoleRepo.Verify(r => r.SetRolesAsync(It.IsAny<Guid>(), It.IsAny<IList<Role>>(), It.IsAny<CancellationToken>()), Times.Never);
	}

	[Fact]
	[Trait("AC", "M1.1UC12")]
	public async Task HandleAsync_EmptyRoles_ThrowsValidationException()
	{
		var userId = Guid.NewGuid();
		var user = new User(userId, Email.Create("teacher@test.com"), DateTime.UtcNow);

		UserRepo
			.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(user);

		await Should.ThrowAsync<ValidationException>(
			() => Handler.HandleAsync(
				new UpdateUserRolesCommand(userId, new UpdateUserRolesRequest([])),
				TestContext.Current.CancellationToken));

		UserRoleRepo.Verify(r => r.SetRolesAsync(It.IsAny<Guid>(), It.IsAny<IList<Role>>(), It.IsAny<CancellationToken>()), Times.Never);
	}

	[Fact]
	[Trait("AC", "M1.1UC25")]
	public async Task HandleAsync_SelfEdit_ThrowsDomainException()
	{
		var userId = RequestingUserId;

		await Should.ThrowAsync<DomainException>(
			() => Handler.HandleAsync(
				new UpdateUserRolesCommand(userId, new UpdateUserRolesRequest([Role.Teacher])),
				TestContext.Current.CancellationToken));

		UserRepo.Verify(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
	}

	[Fact]
	[Trait("AC", "M1.1UC26")]
	public async Task HandleAsync_SeedAdmin_ThrowsDomainException()
	{
		var userId = Guid.NewGuid();
		var user = new User(userId, Email.Create("admin@panorama-music.com"), DateTime.UtcNow);

		UserRepo
			.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(user);

		var seedAdminOptions = new Mock<IAdminOptions>();
		seedAdminOptions.Setup(a => a.SeedAdminEmail).Returns("admin@panorama-music.com");
		var handler = new UpdateUserRolesHandler(UserRepo.Object, UserRoleRepo.Object, seedAdminOptions.Object, CurrentUser);

		await Should.ThrowAsync<DomainException>(
			() => handler.HandleAsync(
				new UpdateUserRolesCommand(userId, new UpdateUserRolesRequest([Role.Teacher])),
				TestContext.Current.CancellationToken));

		UserRoleRepo.Verify(r => r.SetRolesAsync(It.IsAny<Guid>(), It.IsAny<IList<Role>>(), It.IsAny<CancellationToken>()), Times.Never);
	}
}