using Moq;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Students.Application.Interfaces;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Events.Students;
using PanoramaMusic.Students.Infrastructure.Translators.Students;
using PanoramaMusic.Students.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Infrastructure;

/// <summary>
/// A student is reachable from the roster and from the waiting list under
/// different permissions, and both surfaces write the same record and emit the
/// same audit type. These cover the one thing that tells them apart once the
/// write has landed.
/// </summary>
public class StudentWriteSourceAuditTests
{
	private const string _sourceKey = "source";

	private readonly StudentUpdatedTranslator _updatedTranslator;
	private readonly StudentDeletedTranslator _deletedTranslator;

	public StudentWriteSourceAuditTests()
	{
		var auditContext = new Mock<IAuditContext>();
		auditContext.SetupGet(c => c.SourceIp).Returns("203.0.113.7");
		auditContext.SetupGet(c => c.UserAgent).Returns("panorama-tests");
		auditContext.SetupGet(c => c.CorrelationId).Returns(Guid.NewGuid());

		var userContext = new Mock<IUserContext>();
		userContext.SetupGet(c => c.UserId).Returns(Guid.NewGuid());
		userContext.SetupGet(c => c.Email).Returns("coordinator@example.com");

		_updatedTranslator = new StudentUpdatedTranslator(auditContext.Object, userContext.Object);
		_deletedTranslator = new StudentDeletedTranslator(auditContext.Object, userContext.Object);
	}

	[Fact]
	[Trait("AC", "300UC12")]
	public void Translate_AWaitingListUpdate_NamesTheWaitingListAsItsSource()
	{
		var rosterEvent = _updatedTranslator.Translate(UpdateOf(StudentWriteSource.Roster));
		var waitingListEvent = _updatedTranslator.Translate(UpdateOf(StudentWriteSource.WaitingList));

		ShouldlyHelpers.Satisfy(
			() => waitingListEvent.Detail[_sourceKey].ShouldBe("waitingList"),
			// The distinction stands in the record itself, without joining a
			// request log on the correlation id.
			() => rosterEvent.Detail.ShouldNotBe(waitingListEvent.Detail),
			// The event type is unchanged: the entity is still a student, and
			// only the metadata says which surface reached it.
			() => waitingListEvent.EventType.ShouldBe(rosterEvent.EventType),
			// The field diff the record already carried is not displaced by it.
			() => waitingListEvent.Detail["changes"].ShouldNotBeNull(),
			() => waitingListEvent.Detail["targetDisplay"].ShouldBe("Amarah Pillay"));
	}

	[Fact]
	[Trait("AC", "300UC13")]
	public void Translate_AWaitingListRemoval_NamesTheWaitingListAsItsSource()
	{
		var rosterEvent = _deletedTranslator.Translate(DeletionOf(StudentWriteSource.Roster));
		var waitingListEvent = _deletedTranslator.Translate(DeletionOf(StudentWriteSource.WaitingList));

		ShouldlyHelpers.Satisfy(
			() => waitingListEvent.Detail[_sourceKey].ShouldBe("waitingList"),
			() => rosterEvent.Detail.ShouldNotBe(waitingListEvent.Detail),
			() => waitingListEvent.EventType.ShouldBe(rosterEvent.EventType),
			() => waitingListEvent.Detail["targetDisplay"].ShouldBe("Amara Pillay"));
	}

	[Fact]
	[Trait("AC", "300UC14")]
	public void Translate_ARosterUpdateOrDeletion_CarriesNoSourceAtAll()
	{
		var updated = _updatedTranslator.Translate(UpdateOf(StudentWriteSource.Roster));
		var deleted = _deletedTranslator.Translate(DeletionOf(StudentWriteSource.Roster));

		ShouldlyHelpers.Satisfy(
			// The roster is where a student record lives, so its detail bag is
			// byte-identical to what it held before the waiting list needed
			// naming — the key is absent, not present and empty.
			() => updated.Detail.Keys.ShouldBe(["targetDisplay", "changes"], ignoreOrder: true),
			() => deleted.Detail.Keys.ShouldBe(["targetDisplay"]));
	}

	private static StudentUpdated UpdateOf(StudentWriteSource source)
	{
		var student = StudentFactory.Create(firstName: "Amara", lastName: "Pillay");
		student.Update(
			"Amarah",
			"Pillay",
			new DateOnly(2016, 2, 14),
			GradeType.Grade4,
			ClassType.A1,
			PhaseType.Junior,
			Language.English,
			source);

		return student.DrainEvents().OfType<StudentUpdated>().Single();
	}

	private static StudentDeleted DeletionOf(StudentWriteSource source)
	{
		var student = StudentFactory.Create(firstName: "Amara", lastName: "Pillay");
		student.MarkDeleted(source);

		return student.DrainEvents().OfType<StudentDeleted>().Single();
	}
}
