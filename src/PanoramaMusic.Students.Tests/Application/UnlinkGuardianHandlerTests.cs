using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Students.Application.Commands.Guardians;
using PanoramaMusic.Students.Application.Handlers.Guardians;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Application;

public class UnlinkGuardianHandlerTests : IClassFixture<StudentsTestFixture>
{
	private readonly StudentsTestContext _context;
	private readonly UnlinkGuardianHandler _handler;

	public UnlinkGuardianHandlerTests(StudentsTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<UnlinkGuardianHandler>();
	}

	[Fact]
	[Trait("AC", "212UC9")]
	public async Task HandleAsync_GuardianStillLinkedToOtherStudents_UnlinksWithoutDeletingRecord()
	{
		var student = StudentFactory.Create();
		var guardian = GuardianFactory.Create();

		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(student);
		_context.Repositories.GuardianRepositoryMock
			.Setup(r => r.GetByIdAsync(guardian.GuardianId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(guardian);
		_context.Repositories.StudentGuardianRepositoryMock
			.Setup(r => r.GetLinkCountAsync(guardian.GuardianId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(1);

		await _handler.HandleAsync(new UnlinkGuardianCommand(student.StudentId, guardian.GuardianId), TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => _context.Repositories.StudentGuardianRepositoryMock.Verify(
				r => r.DeleteAsync(
					It.Is<StudentGuardian>(l => l.StudentId == student.StudentId && l.GuardianId == guardian.GuardianId),
					It.IsAny<CancellationToken>()),
				Times.Once),
			() => _context.Repositories.GuardianRepositoryMock.Verify(
				r => r.DeleteAsync(It.IsAny<Guardian>(), It.IsAny<CancellationToken>()), Times.Never));
	}

	[Fact]
	[Trait("AC", "212UC11")]
	public async Task HandleAsync_LastRemainingLink_DeletesGuardianRecord()
	{
		var student = StudentFactory.Create();
		var guardian = GuardianFactory.Create();

		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(student);
		_context.Repositories.GuardianRepositoryMock
			.Setup(r => r.GetByIdAsync(guardian.GuardianId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(guardian);
		_context.Repositories.StudentGuardianRepositoryMock
			.Setup(r => r.GetLinkCountAsync(guardian.GuardianId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(0);

		await _handler.HandleAsync(new UnlinkGuardianCommand(student.StudentId, guardian.GuardianId), TestContext.Current.CancellationToken);

		_context.Repositories.GuardianRepositoryMock.Verify(
			r => r.DeleteAsync(It.Is<Guardian>(g => g.GuardianId == guardian.GuardianId), It.IsAny<CancellationToken>()), Times.Once);
	}
}