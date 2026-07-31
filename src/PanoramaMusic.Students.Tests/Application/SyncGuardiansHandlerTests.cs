using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Students.Application.Handlers.Guardians;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Application;

public class SyncGuardiansHandlerTests : IClassFixture<StudentsTestFixture>
{
	private readonly StudentsTestContext _context;
	private readonly SyncGuardiansHandler _handler;

	public SyncGuardiansHandlerTests(StudentsTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<SyncGuardiansHandler>();
	}

	[Fact]
	[Trait("AC", "212UC12")]
	public async Task HandleAsync_StudentMissingSiblingGroupGuardians_LinksEveryMissingGuardian()
	{
		var student = StudentFactory.Create();
		var missingOne = GuardianFactory.Create(firstName: "Nomvula", surname: "Dube");
		var missingTwo = GuardianFactory.Create(firstName: "Peter", surname: "Dube");

		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(student);
		_context.Repositories.StudentGuardianRepositoryMock
			.Setup(r => r.GetMissingSiblingGuardiansAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([missingOne, missingTwo]);

		var result = await _handler.HandleAsync(student.StudentId, TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.Select(g => g.GuardianId).ShouldBe([missingOne.GuardianId, missingTwo.GuardianId], ignoreOrder: true),
			() => _context.Repositories.StudentGuardianRepositoryMock.Verify(
				r => r.CreateAsync(
					It.Is<StudentGuardian>(l => l.StudentId == student.StudentId && l.GuardianId == missingOne.GuardianId),
					It.IsAny<CancellationToken>()),
				Times.Once),
			() => _context.Repositories.StudentGuardianRepositoryMock.Verify(
				r => r.CreateAsync(
					It.Is<StudentGuardian>(l => l.StudentId == student.StudentId && l.GuardianId == missingTwo.GuardianId),
					It.IsAny<CancellationToken>()),
				Times.Once));
	}

	[Fact]
	[Trait("AC", "212UC12")]
	public async Task HandleAsync_NoMissingGuardians_LinksNothing()
	{
		var student = StudentFactory.Create();

		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(student);
		_context.Repositories.StudentGuardianRepositoryMock
			.Setup(r => r.GetMissingSiblingGuardiansAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([]);

		var result = await _handler.HandleAsync(student.StudentId, TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.ShouldBeEmpty(),
			() => _context.Repositories.StudentGuardianRepositoryMock.Verify(
				r => r.CreateAsync(It.IsAny<StudentGuardian>(), It.IsAny<CancellationToken>()), Times.Never));
	}
}