using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Students.Application.Handlers.Guardians;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Application;

public class GetMissingSiblingGuardiansHandlerTests : IClassFixture<StudentsTestFixture>
{
	private readonly StudentsTestContext _context;
	private readonly GetMissingSiblingGuardiansHandler _handler;

	public GetMissingSiblingGuardiansHandlerTests(StudentsTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<GetMissingSiblingGuardiansHandler>();
	}

	[Fact]
	public async Task HandleAsync_StudentMissingSiblingGroupGuardians_ReturnsThemWithoutLinking()
	{
		var student = StudentFactory.Create();
		var missing = GuardianFactory.Create(firstName: "Nomvula", surname: "Dube");

		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(student);
		_context.Repositories.StudentGuardianRepositoryMock
			.Setup(r => r.GetMissingSiblingGuardiansAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([missing]);

		var result = await _handler.HandleAsync(student.StudentId, TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.Select(g => g.GuardianId).ShouldBe([missing.GuardianId]),
			() => _context.Repositories.StudentGuardianRepositoryMock.Verify(
				r => r.CreateAsync(It.IsAny<StudentGuardian>(), It.IsAny<CancellationToken>()), Times.Never));
	}

	[Fact]
	public async Task HandleAsync_UnknownStudent_ThrowsEntityNotFoundException()
	{
		var studentId = Guid.NewGuid();

		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(studentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync((Student?)null);

		await Should.ThrowAsync<EntityNotFoundException>(
			() => _handler.HandleAsync(studentId, TestContext.Current.CancellationToken));
	}
}