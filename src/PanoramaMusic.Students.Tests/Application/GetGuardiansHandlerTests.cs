using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Students.Application.Handlers.Guardians;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Application;

public class GetGuardiansHandlerTests : IClassFixture<StudentsTestFixture>
{
	private readonly StudentsTestContext _context;
	private readonly GetGuardiansHandler _handler;

	public GetGuardiansHandlerTests(StudentsTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<GetGuardiansHandler>();
	}

	[Fact]
	[Trait("AC", "212UC4")]
	public async Task HandleAsync_StudentWithLinkedGuardians_ReturnsAllLinkedGuardiansWithRelationshipTypes()
	{
		var student = StudentFactory.Create();
		var guardianOne = GuardianFactory.Create(firstName: "Nomvula", surname: "Dube");
		var guardianTwo = GuardianFactory.Create(firstName: "Peter", surname: "Dube");

		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(student);
		_context.Repositories.StudentGuardianRepositoryMock
			.Setup(r => r.GetGuardiansByStudentIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([guardianOne, guardianTwo]);

		var result = await _handler.HandleAsync(student.StudentId, TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.Select(g => g.GuardianId).ShouldBe([guardianOne.GuardianId, guardianTwo.GuardianId], ignoreOrder: true),
			() => result.ShouldAllBe(g => g.GuardianRelationshipId != Guid.Empty));
	}

	[Fact]
	[Trait("AC", "212UC4")]
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