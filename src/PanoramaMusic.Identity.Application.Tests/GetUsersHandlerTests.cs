using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Identity.Application.Handlers.Admin;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Domain.ValueObjects;
using PanoramaMusic.Identity.Tests;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Application.Tests;

public class GetUsersHandlerTests : IClassFixture<IdentityTestFixture>
{
	private readonly IdentityTestContext _context;
	private readonly GetUsersHandler _handler;

	public GetUsersHandlerTests(IdentityTestFixture fixture)
	{
		_context = fixture.CreateContext();

		_context.Options.AdminOptionsMock
			.Setup(a => a.SeedAdminEmail)
			.Returns(string.Empty);

		_handler = _context.ServiceProvider.GetRequiredService<GetUsersHandler>();
	}

	[Fact]
	[Trait("AC", "M1UC48")]
	public async Task HandleAsync_WithUsers_ReturnsSummaryForEachUser()
	{
		var user1 = new User(Guid.NewGuid(), Email.Create("admin@test.com"), DateTime.UtcNow);
		var user2 = new User(Guid.NewGuid(), Email.Create("teacher@test.com"), DateTime.UtcNow);

		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
			.ReturnsAsync([user1, user2]);

		_context.Repositories.UserRoleRepositoryMock
			.Setup(r => r.GetRolesAsync(user1.UserId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([Role.Admin]);

		_context.Repositories.UserRoleRepositoryMock
			.Setup(r => r.GetRolesAsync(user2.UserId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([Role.Teacher]);

		var result = await _handler.HandleAsync(TestContext.Current.CancellationToken);

		result.Count.ShouldBe(2);
		result.ShouldSatisfyAllConditions(
			result => result[0].Email.ShouldBe("admin@test.com"),
			result => result[0].Roles.ShouldContain(Role.Admin),
			result => result[0].IsProtected.ShouldBeFalse(),
			result => result[1].Email.ShouldBe("teacher@test.com"),
			result => result[1].Roles.ShouldContain(Role.Teacher),
			result => result[1].IsProtected.ShouldBeFalse());
	}

	[Fact]
	[Trait("AC", "M1UC48")]
	public async Task HandleAsync_NoUsers_ReturnsEmptyList()
	{
		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
			.ReturnsAsync([]);

		var result = await _handler.HandleAsync(TestContext.Current.CancellationToken);

		result.ShouldBeEmpty();
	}
}