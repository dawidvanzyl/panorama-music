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

	[Fact]
	[Trait("AC", "300UC7")]
	public async Task HandleAsync_CoordinatorReadingAMixedList_FlagsOnlyTheGuardiansAnEnrolledStudentHolds()
	{
		_context.ActAsCoordinator();

		var student = StudentFactory.Create();
		var shared = GuardianFactory.Create(firstName: "Nomvula", surname: "Dube");
		var unshared = GuardianFactory.Create(firstName: "Peter", surname: "Dube");

		SetupGuardians(student, [shared, unshared]);
		_context.Repositories.StudentGuardianRepositoryMock
			.Setup(r => r.GetEnrolledLinkedGuardianIdsAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([shared.GuardianId]);

		var result = await _handler.HandleAsync(student.StudentId, TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			// Reading is never restricted — a coordinator sees the whole list,
			// each row saying whether it may be maintained.
			() => result.Count.ShouldBe(2),
			() => result.Single(g => g.GuardianId == shared.GuardianId).Restricted.ShouldBeTrue(),
			() => result.Single(g => g.GuardianId == unshared.GuardianId).Restricted.ShouldBeFalse(),
			// Resolved in one query, not a lookup per row.
			() => _context.Repositories.StudentGuardianRepositoryMock.Verify(
				r => r.GetEnrolledLinkedGuardianIdsAsync(student.StudentId, It.IsAny<CancellationToken>()), Times.Once));
	}

	[Fact]
	[Trait("AC", "300UC7")]
	public async Task HandleAsync_TeacherReadingTheSameList_FlagsNothingAsRestricted()
	{
		var student = StudentFactory.Create();
		var shared = GuardianFactory.Create(firstName: "Nomvula", surname: "Dube");

		SetupGuardians(student, [shared]);

		var result = await _handler.HandleAsync(student.StudentId, TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.ShouldHaveSingleItem().Restricted.ShouldBeFalse(),
			() => _context.Repositories.StudentGuardianRepositoryMock.Verify(
				r => r.GetEnrolledLinkedGuardianIdsAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never));
	}

	private void SetupGuardians(Student student, IList<Guardian> guardians)
	{
		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(student);
		_context.Repositories.StudentGuardianRepositoryMock
			.Setup(r => r.GetGuardiansByStudentIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(guardians);
	}
}