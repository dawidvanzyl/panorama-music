using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Teachers.Application.Commands.Teachers;
using PanoramaMusic.Teachers.Application.Handlers.Teachers;
using PanoramaMusic.Teachers.Domain.Entities;
using PanoramaMusic.Teachers.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Teachers.Tests.Application;

public class DeactivateTeacherHandlerTests : IClassFixture<TeachersTestFixture>
{
	private readonly TeachersTestContext _context;
	private readonly DeactivateTeacherHandler _handler;

	public DeactivateTeacherHandlerTests(TeachersTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<DeactivateTeacherHandler>();
	}

	[Fact]
	[Trait("AC", "234UC1")]
	public async Task HandleAsync_TeacherWithBankingDetails_DeletesThemAlongsideTheStateChange()
	{
		var teacher = TeacherFactory.Create();
		var bankingDetails = BankingDetailsFactory.Restore(teacher.TeacherId);
		SetupTeacher(teacher);
		_context.Repositories.BankingDetailsRepositoryMock
			.Setup(r => r.GetByTeacherIdAsync(teacher.TeacherId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(bankingDetails);
		_context.Repositories.BankingDetailsRepositoryMock
			.Setup(r => r.DeleteAsync(It.IsAny<BankingDetails>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		var result = await _handler.HandleAsync(
			new DeactivateTeacherCommand(teacher.TeacherId),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.IsActive.ShouldBeFalse(),
			() => result.Banking.ShouldBeNull(),
			() => _context.Repositories.BankingDetailsRepositoryMock.Verify(
				r => r.DeleteAsync(bankingDetails, It.IsAny<CancellationToken>()), Times.Once));
	}

	[Fact]
	[Trait("AC", "234UC1")]
	public async Task HandleAsync_TeacherWithoutBankingDetails_DeactivatesWithoutAttemptingADelete()
	{
		var teacher = TeacherFactory.Create();
		SetupTeacher(teacher);
		// Having none to delete is the ordinary case, not a failure — the
		// deactivation still stands on its own.
		_context.Repositories.BankingDetailsRepositoryMock
			.Setup(r => r.GetByTeacherIdAsync(teacher.TeacherId, It.IsAny<CancellationToken>()))
			.ReturnsAsync((BankingDetails?)null);

		var result = await _handler.HandleAsync(
			new DeactivateTeacherCommand(teacher.TeacherId),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.IsActive.ShouldBeFalse(),
			() => _context.Repositories.TeacherRepositoryMock.Verify(
				r => r.DeactivateAsync(It.IsAny<Teacher>(), It.IsAny<CancellationToken>()), Times.Once),
			() => _context.Repositories.BankingDetailsRepositoryMock.Verify(
				r => r.DeleteAsync(It.IsAny<BankingDetails>(), It.IsAny<CancellationToken>()), Times.Never));
	}

	private void SetupTeacher(Teacher teacher)
	{
		_context.Repositories.TeacherRepositoryMock
			.Setup(r => r.GetByIdAsync(teacher.TeacherId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(teacher);
		_context.Repositories.TeacherRepositoryMock
			.Setup(r => r.DeactivateAsync(It.IsAny<Teacher>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);
	}
}