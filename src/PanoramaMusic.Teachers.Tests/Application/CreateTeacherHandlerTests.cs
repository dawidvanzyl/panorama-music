using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Teachers.Application.Commands.Teachers;
using PanoramaMusic.Teachers.Application.Handlers.Teachers;
using PanoramaMusic.Teachers.Application.Requests.Teachers;
using PanoramaMusic.Teachers.Domain.Entities;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Teachers.Tests.Application;

public class CreateTeacherHandlerTests : IClassFixture<TeachersTestFixture>
{
	private readonly TeachersTestContext _context;
	private readonly CreateTeacherHandler _handler;

	public CreateTeacherHandlerTests(TeachersTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<CreateTeacherHandler>();
	}

	[Fact]
	[Trait("AC", "231UC1")]
	public async Task HandleAsync_ValidRequest_PersistsAndReturnsActiveTeacherWithId()
	{
		_context.Repositories.TeacherRepositoryMock
			.Setup(r => r.CreateAsync(It.IsAny<Teacher>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		var request = new CreateTeacherRequest("Alice", "Vance", IsPrivate: false);

		var result = await _handler.HandleAsync(
			new CreateTeacherCommand(request),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.ShouldNotBeNull().ShouldSatisfyAllConditions(
				() => result.TeacherId.ShouldNotBe(Guid.Empty),
				() => result.FirstName.ShouldBe("Alice"),
				() => result.Surname.ShouldBe("Vance"),
				() => result.IsPrivate.ShouldBeFalse(),
				() => result.IsActive.ShouldBeTrue(),
				() => result.LinkedAccountId.ShouldBeNull()),
			() => _context.Repositories.TeacherRepositoryMock.Verify(
				r => r.CreateAsync(It.IsAny<Teacher>(), TestContext.Current.CancellationToken), Times.Once));
	}
}