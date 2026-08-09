using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Teachers.Application.Commands.Teachers;
using PanoramaMusic.Teachers.Application.Handlers.Teachers;
using PanoramaMusic.Teachers.Domain.Entities;
using PanoramaMusic.Teachers.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Teachers.Tests.Application;

public class ReactivateTeacherHandlerTests : IClassFixture<TeachersTestFixture>
{
	private readonly TeachersTestContext _context;
	private readonly ReactivateTeacherHandler _handler;

	public ReactivateTeacherHandlerTests(TeachersTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<ReactivateTeacherHandler>();
	}

	[Fact]
	[Trait("AC", "234UC5")]
	public async Task HandleAsync_DeactivatedTeacher_ReturnsThemToActiveWithNoBankingDetails()
	{
		var teacher = TeacherFactory.CreateDeactivated();
		_context.Repositories.TeacherRepositoryMock
			.Setup(r => r.GetByIdAsync(teacher.TeacherId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(teacher);
		_context.Repositories.TeacherRepositoryMock
			.Setup(r => r.ReactivateAsync(It.IsAny<Teacher>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		var result = await _handler.HandleAsync(
			new ReactivateTeacherCommand(teacher.TeacherId),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.IsActive.ShouldBeTrue(),
			// Deactivation deleted them and nothing retains them, so reactivation
			// cannot bring them back.
			() => result.Banking.ShouldBeNull(),
			() => _context.Repositories.TeacherRepositoryMock.Verify(
				r => r.ReactivateAsync(It.IsAny<Teacher>(), TestContext.Current.CancellationToken), Times.Once));
	}
}