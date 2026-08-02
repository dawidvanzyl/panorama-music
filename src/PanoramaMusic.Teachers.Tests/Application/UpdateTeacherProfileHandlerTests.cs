using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Teachers.Application.Commands.Teachers;
using PanoramaMusic.Teachers.Application.Handlers.Teachers;
using PanoramaMusic.Teachers.Application.Requests.Teachers;
using PanoramaMusic.Teachers.Domain.Entities;
using PanoramaMusic.Teachers.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Teachers.Tests.Application;

public class UpdateTeacherProfileHandlerTests : IClassFixture<TeachersTestFixture>
{
	private readonly TeachersTestContext _context;
	private readonly UpdateTeacherProfileHandler _handler;

	public UpdateTeacherProfileHandlerTests(TeachersTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<UpdateTeacherProfileHandler>();
	}

	[Fact]
	[Trait("AC", "231UC2")]
	public async Task HandleAsync_ExistingTeacher_PersistsAndReturnsUpdatedNamesLeavingClassificationUntouched()
	{
		var teacher = TeacherFactory.Create(firstName: "Alice", surname: "Vance", isPrivate: true);
		_context.Repositories.TeacherRepositoryMock
			.Setup(r => r.GetByIdAsync(teacher.TeacherId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(teacher);
		_context.Repositories.TeacherRepositoryMock
			.Setup(r => r.UpdateProfileAsync(It.IsAny<Teacher>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		var request = new UpdateTeacherProfileRequest("Alicia", "Vance-Smith");

		var result = await _handler.HandleAsync(
			new UpdateTeacherProfileCommand(teacher.TeacherId, request),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.ShouldNotBeNull().ShouldSatisfyAllConditions(
				() => result.TeacherId.ShouldBe(teacher.TeacherId),
				() => result.FirstName.ShouldBe("Alicia"),
				() => result.Surname.ShouldBe("Vance-Smith"),
				() => result.IsPrivate.ShouldBeTrue()),
			() => _context.Repositories.TeacherRepositoryMock.Verify(
				r => r.UpdateProfileAsync(It.IsAny<Teacher>(), TestContext.Current.CancellationToken), Times.Once),
			() => _context.Repositories.TeacherRepositoryMock.Verify(
				r => r.UpdateClassificationAsync(It.IsAny<Teacher>(), It.IsAny<CancellationToken>()), Times.Never));
	}
}