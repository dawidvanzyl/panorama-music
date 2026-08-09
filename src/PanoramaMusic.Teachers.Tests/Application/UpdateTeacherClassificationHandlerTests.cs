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

public class UpdateTeacherClassificationHandlerTests : IClassFixture<TeachersTestFixture>
{
	private readonly TeachersTestContext _context;
	private readonly UpdateTeacherClassificationHandler _handler;

	public UpdateTeacherClassificationHandlerTests(TeachersTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<UpdateTeacherClassificationHandler>();
	}

	[Fact]
	[Trait("AC", "231UC2")]
	public async Task HandleAsync_ExistingTeacher_PersistsClassificationOnItsOwnLeavingNamesUntouched()
	{
		var teacher = TeacherFactory.Create(firstName: "Alice", surname: "Vance", isPrivate: false);
		_context.Repositories.TeacherRepositoryMock
			.Setup(r => r.GetByIdAsync(teacher.TeacherId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(teacher);
		_context.Repositories.TeacherRepositoryMock
			.Setup(r => r.UpdateClassificationAsync(It.IsAny<Teacher>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		var result = await _handler.HandleAsync(
			new UpdateTeacherClassificationCommand(teacher.TeacherId, new UpdateTeacherClassificationRequest(IsPrivate: true)),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.ShouldNotBeNull().ShouldSatisfyAllConditions(
				() => result.TeacherId.ShouldBe(teacher.TeacherId),
				() => result.IsPrivate.ShouldBeTrue(),
				() => result.FirstName.ShouldBe("Alice"),
				() => result.Surname.ShouldBe("Vance")),
			() => _context.Repositories.TeacherRepositoryMock.Verify(
				r => r.UpdateClassificationAsync(It.IsAny<Teacher>(), TestContext.Current.CancellationToken), Times.Once),
			() => _context.Repositories.TeacherRepositoryMock.Verify(
				r => r.UpdateProfileAsync(It.IsAny<Teacher>(), It.IsAny<CancellationToken>()), Times.Never));
	}
}