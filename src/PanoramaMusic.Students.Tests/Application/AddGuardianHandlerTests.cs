using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Students.Application.Commands.Guardians;
using PanoramaMusic.Students.Application.Handlers.Guardians;
using PanoramaMusic.Students.Application.Requests.Guardians;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Application;

public class AddGuardianHandlerTests : IClassFixture<StudentsTestFixture>
{
	private readonly StudentsTestContext _context;
	private readonly AddGuardianHandler _handler;

	public AddGuardianHandlerTests(StudentsTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<AddGuardianHandler>();
	}

	private static AddGuardianRequest BuildRequest(
		Guid guardianRelationshipId, bool receivesCorrespondence = true, bool responsibleForPayment = true, bool married = false) =>
		new(guardianRelationshipId, "Nomvula", "Dube", "0821234567", "nomvula.dube@example.com", receivesCorrespondence, responsibleForPayment, married);

	[Fact]
	[Trait("AC", "212UC1")]
	public async Task HandleAsync_ValidRequest_CreatesGuardianAndLinksToStudent()
	{
		var student = StudentFactory.Create();
		var relationship = new GuardianRelationship(Guid.NewGuid(), "Mother");

		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(student);
		_context.Repositories.GuardianRelationshipRepositoryMock
			.Setup(r => r.GetByIdAsync(relationship.GuardianRelationshipId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(relationship);
		_context.Repositories.SiblingRepositoryMock
			.Setup(r => r.GetSiblingsAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([]);

		var result = await _handler.HandleAsync(
			new AddGuardianCommand(student.StudentId, BuildRequest(relationship.GuardianRelationshipId)),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.FirstName.ShouldBe("Nomvula"),
			() => result.GuardianRelationshipId.ShouldBe(relationship.GuardianRelationshipId),
			() => _context.Repositories.GuardianRepositoryMock.Verify(
				r => r.CreateAsync(It.IsAny<Guardian>(), It.IsAny<CancellationToken>()), Times.Once),
			() => _context.Repositories.StudentGuardianRepositoryMock.Verify(
				r => r.CreateAsync(It.Is<StudentGuardian>(l => l.StudentId == student.StudentId), It.IsAny<CancellationToken>()),
				Times.Once));
	}

	[Fact]
	[Trait("AC", "212UC2")]
	public async Task HandleAsync_UnknownGuardianRelationshipId_ThrowsDomainException()
	{
		var student = StudentFactory.Create();

		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(student);
		_context.Repositories.GuardianRelationshipRepositoryMock
			.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync((GuardianRelationship?)null);

		await Should.ThrowAsync<DomainException>(
			() => _handler.HandleAsync(new AddGuardianCommand(student.StudentId, BuildRequest(Guid.NewGuid())), TestContext.Current.CancellationToken));

		_context.Repositories.GuardianRepositoryMock.Verify(
			r => r.CreateAsync(It.IsAny<Guardian>(), It.IsAny<CancellationToken>()), Times.Never);
	}

	[Fact]
	[Trait("AC", "212UC5")]
	public async Task HandleAsync_FlagsProvided_PersistsEachFlagExactlyAsGiven()
	{
		var student = StudentFactory.Create();
		var relationship = new GuardianRelationship(Guid.NewGuid(), "Father");

		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(student);
		_context.Repositories.GuardianRelationshipRepositoryMock
			.Setup(r => r.GetByIdAsync(relationship.GuardianRelationshipId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(relationship);
		_context.Repositories.SiblingRepositoryMock
			.Setup(r => r.GetSiblingsAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([]);

		var result = await _handler.HandleAsync(
			new AddGuardianCommand(
				student.StudentId,
				BuildRequest(relationship.GuardianRelationshipId, receivesCorrespondence: true, responsibleForPayment: false, married: true)),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.ReceivesCorrespondence.ShouldBeTrue(),
			() => result.ResponsibleForPayment.ShouldBeFalse(),
			() => result.Married.ShouldBeTrue());
	}

	[Fact]
	[Trait("AC", "212UC6")]
	public async Task HandleAsync_StudentWithSiblings_LinksGuardianToStudentAndEverySibling()
	{
		var student = StudentFactory.Create();
		var siblingOne = StudentFactory.Create(firstName: "Julian", lastName: "Thorne");
		var siblingTwo = StudentFactory.Create(firstName: "Priya", lastName: "Okafor");
		var relationship = new GuardianRelationship(Guid.NewGuid(), "Mother");

		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(student);
		_context.Repositories.GuardianRelationshipRepositoryMock
			.Setup(r => r.GetByIdAsync(relationship.GuardianRelationshipId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(relationship);
		_context.Repositories.SiblingRepositoryMock
			.Setup(r => r.GetSiblingsAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([siblingOne, siblingTwo]);

		await _handler.HandleAsync(
			new AddGuardianCommand(student.StudentId, BuildRequest(relationship.GuardianRelationshipId)),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => _context.Repositories.StudentGuardianRepositoryMock.Verify(
				r => r.CreateAsync(It.Is<StudentGuardian>(l => l.StudentId == student.StudentId), It.IsAny<CancellationToken>()), Times.Once),
			() => _context.Repositories.StudentGuardianRepositoryMock.Verify(
				r => r.CreateAsync(It.Is<StudentGuardian>(l => l.StudentId == siblingOne.StudentId), It.IsAny<CancellationToken>()), Times.Once),
			() => _context.Repositories.StudentGuardianRepositoryMock.Verify(
				r => r.CreateAsync(It.Is<StudentGuardian>(l => l.StudentId == siblingTwo.StudentId), It.IsAny<CancellationToken>()), Times.Once));
	}

	[Fact]
	[Trait("AC", "212UC8")]
	public async Task HandleAsync_SecondGuardianWithSameRelationshipType_IsLinked()
	{
		var student = StudentFactory.Create();
		var relationship = new GuardianRelationship(Guid.NewGuid(), "Mother");

		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(student);
		_context.Repositories.GuardianRelationshipRepositoryMock
			.Setup(r => r.GetByIdAsync(relationship.GuardianRelationshipId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(relationship);
		_context.Repositories.SiblingRepositoryMock
			.Setup(r => r.GetSiblingsAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([]);

		var first = await _handler.HandleAsync(
			new AddGuardianCommand(student.StudentId, BuildRequest(relationship.GuardianRelationshipId)),
			TestContext.Current.CancellationToken);
		var second = await _handler.HandleAsync(
			new AddGuardianCommand(student.StudentId, BuildRequest(relationship.GuardianRelationshipId)),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => first.GuardianRelationshipId.ShouldBe(relationship.GuardianRelationshipId),
			() => second.GuardianRelationshipId.ShouldBe(relationship.GuardianRelationshipId),
			() => first.GuardianId.ShouldNotBe(second.GuardianId),
			() => _context.Repositories.GuardianRepositoryMock.Verify(
				r => r.CreateAsync(It.IsAny<Guardian>(), It.IsAny<CancellationToken>()), Times.Exactly(2)));
	}
}