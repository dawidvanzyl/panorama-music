using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Teachers.Application.Commands.Teachers;
using PanoramaMusic.Teachers.Application.Handlers.Teachers;
using PanoramaMusic.Teachers.Domain.Entities;
using PanoramaMusic.Teachers.Domain.Exceptions;
using PanoramaMusic.Teachers.Domain.Messages;
using PanoramaMusic.Teachers.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Teachers.Tests.Application;

public class DeleteTeacherHandlerTests : IClassFixture<TeachersTestFixture>
{
	private readonly TeachersTestContext _context;
	private readonly DeleteTeacherHandler _handler;

	public DeleteTeacherHandlerTests(TeachersTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<DeleteTeacherHandler>();
	}

	[Fact]
	[Trait("AC", "234UC3")]
	public async Task HandleAsync_ActiveTeacher_IsRejectedAndLeavesTheRecordInPlace()
	{
		var teacher = TeacherFactory.Create();
		_context.Repositories.TeacherRepositoryMock
			.Setup(r => r.GetByIdAsync(teacher.TeacherId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(teacher);

		var exception = await Should.ThrowAsync<DomainException>(
			() => _handler.HandleAsync(new DeleteTeacherCommand(teacher.TeacherId), TestContext.Current.CancellationToken));

		ShouldlyHelpers.Satisfy(
			() => exception.Message.ShouldBe(TeacherLifecycleMessages.TeacherMustBeDeactivatedBeforeDeletion),
			() => teacher.IsActive.ShouldBeTrue(),
			() => _context.Repositories.TeacherRepositoryMock.Verify(
				r => r.DeleteAsync(It.IsAny<Teacher>(), It.IsAny<CancellationToken>()), Times.Never));
	}

	[Fact]
	[Trait("AC", "234UC4")]
	public async Task HandleAsync_DeactivatedTeacher_RemovesTheRecord()
	{
		var teacher = TeacherFactory.CreateDeactivated();
		_context.Repositories.TeacherRepositoryMock
			.Setup(r => r.GetByIdAsync(teacher.TeacherId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(teacher);
		_context.Repositories.TeacherRepositoryMock
			.Setup(r => r.DeleteAsync(It.IsAny<Teacher>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		await _handler.HandleAsync(new DeleteTeacherCommand(teacher.TeacherId), TestContext.Current.CancellationToken);

		_context.Repositories.TeacherRepositoryMock.Verify(
			r => r.DeleteAsync(
				It.Is<Teacher>(t => t.TeacherId == teacher.TeacherId),
				TestContext.Current.CancellationToken),
			Times.Once);
	}
}