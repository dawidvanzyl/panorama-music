using Moq;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Domain;
using PanoramaMusic.Students.Application.Interfaces;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Infrastructure.Translators.Guardians;
using PanoramaMusic.Students.Infrastructure.Translators.Siblings;
using PanoramaMusic.Students.Infrastructure.Translators.Students;
using PanoramaMusic.Students.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Infrastructure;

/// <summary>
/// The student wizard's Student, Siblings and Guardians tabs are the same
/// screens whether they were opened from the roster or from the waiting list,
/// and both surfaces write the same records and emit the same audit types.
/// These cover the one thing that tells them apart once the write has landed.
/// </summary>
public class StudentWriteSourceAuditTests
{
	private const string _sourceKey = "source";

	private static readonly Guid _studentId = Guid.NewGuid();
	private static readonly Guid _siblingId = Guid.NewGuid();

	private readonly IAuditEventTranslator[] _translators;

	public StudentWriteSourceAuditTests()
	{
		var auditContext = new Mock<IAuditContext>();
		auditContext.SetupGet(c => c.SourceIp).Returns("203.0.113.7");
		auditContext.SetupGet(c => c.UserAgent).Returns("panorama-tests");
		auditContext.SetupGet(c => c.CorrelationId).Returns(Guid.NewGuid());

		var userContext = new Mock<IUserContext>();
		userContext.SetupGet(c => c.UserId).Returns(Guid.NewGuid());
		userContext.SetupGet(c => c.Email).Returns("coordinator@example.com");

		_translators =
		[
			new StudentCreatedTranslator(auditContext.Object, userContext.Object),
			new StudentUpdatedTranslator(auditContext.Object, userContext.Object),
			new StudentDeletedTranslator(auditContext.Object, userContext.Object),
			new SiblingAddedTranslator(auditContext.Object, userContext.Object),
			new SiblingRemovedTranslator(auditContext.Object, userContext.Object),
			new GuardianCreatedTranslator(auditContext.Object, userContext.Object),
			new GuardianUpdatedTranslator(auditContext.Object, userContext.Object),
			new GuardianDeletedTranslator(auditContext.Object, userContext.Object),
			new GuardianLinkedTranslator(auditContext.Object, userContext.Object),
			new GuardianUnlinkedTranslator(auditContext.Object, userContext.Object),
		];
	}

	/// <summary>
	/// Every event in scope, each as a function raising it through the surface
	/// it is given. One list so a new shared-tab write is either added here or
	/// visibly missing.
	/// </summary>
	public static TheoryData<string, string[]> EventsReachableFromASharedTab => new()
	{
		{ nameof(StudentCreation), ["studentId", "targetDisplay"] },
		{ nameof(StudentUpdate), ["targetDisplay", "changes"] },
		{ nameof(StudentDeletion), ["targetDisplay"] },
		{ nameof(SiblingAddition), ["siblingId", "targetDisplay"] },
		{ nameof(SiblingRemoval), ["siblingId", "targetDisplay"] },
		{ nameof(GuardianCreation), ["targetDisplay"] },
		{ nameof(GuardianUpdate), ["targetDisplay", "changes"] },
		{ nameof(GuardianDeletion), ["targetDisplay"] },
		{ nameof(GuardianLink), ["guardianId", "targetDisplay"] },
		{ nameof(GuardianUnlink), ["guardianId", "targetDisplay"] },
	};

	[Fact]
	[Trait("AC", "300UC15")]
	public void Translate_AWaitingListCapture_NamesTheWaitingListAsItsSource() =>
		ShouldNameItsSurface(StudentCreation, "studentId", "targetDisplay");

	[Fact]
	[Trait("AC", "300UC12")]
	public void Translate_AWaitingListStudentEdit_NamesTheWaitingListAsItsSource() =>
		ShouldNameItsSurface(StudentUpdate, "targetDisplay", "changes");

	[Fact]
	[Trait("AC", "300UC13")]
	public void Translate_AWaitingListRemoval_NamesTheWaitingListAsItsSource() =>
		ShouldNameItsSurface(StudentDeletion, "targetDisplay");

	[Fact]
	[Trait("AC", "300UC16")]
	public void Translate_ASiblingLinkedThroughTheWaitingList_NamesTheWaitingListAsItsSource() =>
		ShouldNameItsSurface(SiblingAddition, "siblingId", "targetDisplay");

	[Fact]
	[Trait("AC", "300UC16")]
	public void Translate_ASiblingUnlinkedThroughTheWaitingList_NamesTheWaitingListAsItsSource() =>
		ShouldNameItsSurface(SiblingRemoval, "siblingId", "targetDisplay");

	[Fact]
	[Trait("AC", "300UC17")]
	public void Translate_AGuardianCreatedThroughTheWaitingList_NamesTheWaitingListAsItsSource() =>
		ShouldNameItsSurface(GuardianCreation, "targetDisplay");

	[Fact]
	[Trait("AC", "300UC17")]
	public void Translate_AGuardianUpdatedThroughTheWaitingList_NamesTheWaitingListAsItsSource() =>
		ShouldNameItsSurface(GuardianUpdate, "targetDisplay", "changes");

	[Fact]
	[Trait("AC", "300UC17")]
	public void Translate_AGuardianDeletedThroughTheWaitingList_NamesTheWaitingListAsItsSource() =>
		ShouldNameItsSurface(GuardianDeletion, "targetDisplay");

	[Fact]
	[Trait("AC", "300UC17")]
	public void Translate_AGuardianLinkedThroughTheWaitingList_NamesTheWaitingListAsItsSource() =>
		ShouldNameItsSurface(GuardianLink, "guardianId", "targetDisplay");

	[Fact]
	[Trait("AC", "300UC17")]
	public void Translate_AGuardianUnlinkedThroughTheWaitingList_NamesTheWaitingListAsItsSource() =>
		ShouldNameItsSurface(GuardianUnlink, "guardianId", "targetDisplay");

	[Theory]
	[MemberData(nameof(EventsReachableFromASharedTab))]
	[Trait("AC", "300UC14")]
	public void Translate_ARosterWriteThroughAnySharedTab_CarriesNoSourceAtAll(string raiserName, string[] detailKeys)
	{
		var rosterEvent = Translate(RaiserNamed(raiserName)(StudentWriteSource.Roster));

		ShouldlyHelpers.Satisfy(
			// The roster is where these records live, so its detail bag is
			// byte-identical to what it held before the waiting list needed
			// naming — the key is absent, not present and empty.
			() => rosterEvent.Detail.ShouldNotContainKey(_sourceKey),
			() => rosterEvent.Detail.Keys.ShouldBe(detailKeys, ignoreOrder: true));
	}

	private void ShouldNameItsSurface(Func<StudentWriteSource, IDomainEvent> raise, params string[] rosterDetailKeys)
	{
		var rosterEvent = Translate(raise(StudentWriteSource.Roster));
		var waitingListEvent = Translate(raise(StudentWriteSource.WaitingList));

		ShouldlyHelpers.Satisfy(
			// The distinction stands in the record itself, without joining a
			// request log on the correlation id.
			() => waitingListEvent.Detail[_sourceKey].ShouldBe("waitingList"),
			// The entity is the same one either way, so the event type is
			// unchanged and only the metadata says which surface reached it.
			() => waitingListEvent.EventType.ShouldBe(rosterEvent.EventType),
			() => rosterEvent.Detail.Keys.ShouldBe(rosterDetailKeys, ignoreOrder: true),
			// The source is added to what the record already carried, never in
			// place of any of it.
			() => waitingListEvent.Detail.Keys.ShouldBe([.. rosterDetailKeys, _sourceKey], ignoreOrder: true),
			() => waitingListEvent.Detail["targetDisplay"].ShouldBe(rosterEvent.Detail["targetDisplay"]));
	}

	/// <summary>
	/// The one translator that claims this event. Resolving it rather than
	/// naming it also proves each event has exactly one.
	/// </summary>
	private AuditEvent Translate(IDomainEvent domainEvent) =>
		_translators.Single(translator => translator.CanTranslate(domainEvent)).Translate(domainEvent);

	private static Func<StudentWriteSource, IDomainEvent> RaiserNamed(string name) => name switch
	{
		nameof(StudentCreation) => StudentCreation,
		nameof(StudentUpdate) => StudentUpdate,
		nameof(StudentDeletion) => StudentDeletion,
		nameof(SiblingAddition) => SiblingAddition,
		nameof(SiblingRemoval) => SiblingRemoval,
		nameof(GuardianCreation) => GuardianCreation,
		nameof(GuardianUpdate) => GuardianUpdate,
		nameof(GuardianDeletion) => GuardianDeletion,
		nameof(GuardianLink) => GuardianLink,
		nameof(GuardianUnlink) => GuardianUnlink,
		_ => throw new ArgumentOutOfRangeException(nameof(name), name, "No such event raiser."),
	};

	private static IDomainEvent StudentCreation(StudentWriteSource source) =>
		StudentFactory.Create(firstName: "Amara", lastName: "Pillay", source: source).DrainEvents().Single();

	private static IDomainEvent StudentUpdate(StudentWriteSource source)
	{
		var student = StudentFactory.Create(firstName: "Amara", lastName: "Pillay");
		student.DrainEvents();
		student.Update(
			"Amarah",
			"Pillay",
			new DateOnly(2016, 2, 14),
			GradeType.Grade4,
			ClassType.A1,
			PhaseType.Junior,
			Language.English,
			source);

		return student.DrainEvents().Single();
	}

	private static IDomainEvent StudentDeletion(StudentWriteSource source)
	{
		var student = StudentFactory.Create(firstName: "Amara", lastName: "Pillay");
		student.DrainEvents();
		student.MarkDeleted(source);

		return student.DrainEvents().Single();
	}

	private static IDomainEvent SiblingAddition(StudentWriteSource source)
	{
		var (student, siblingStudent) = SiblingGroup();

		return Sibling.Create(student, siblingStudent, source).DrainEvents().Single();
	}

	private static IDomainEvent SiblingRemoval(StudentWriteSource source)
	{
		var (student, siblingStudent) = SiblingGroup();
		var sibling = new Sibling(student.StudentId, siblingStudent.StudentId);
		sibling.MarkRemoved(student, siblingStudent, source);

		return sibling.DrainEvents().Single();
	}

	private static IDomainEvent GuardianCreation(StudentWriteSource source) =>
		GuardianFactory.Create(source: source).DrainEvents().Single();

	private static IDomainEvent GuardianUpdate(StudentWriteSource source)
	{
		var guardian = GuardianFactory.Create();
		guardian.DrainEvents();
		guardian.Update(guardian.GuardianRelationshipId, "Nomvula", "Dube-Adams", "0821234567", guardian.Email, true, true, true, source);

		return guardian.DrainEvents().Single();
	}

	private static IDomainEvent GuardianDeletion(StudentWriteSource source)
	{
		var guardian = GuardianFactory.Create();
		guardian.DrainEvents();
		guardian.MarkDeleted(source);

		return guardian.DrainEvents().Single();
	}

	private static IDomainEvent GuardianLink(StudentWriteSource source) =>
		StudentGuardian.Create(SiblingGroup().Student, GuardianFactory.Create(), source).DrainEvents().Single();

	private static IDomainEvent GuardianUnlink(StudentWriteSource source)
	{
		var student = SiblingGroup().Student;
		var guardian = GuardianFactory.Create();
		var link = new StudentGuardian(student.StudentId, guardian.GuardianId);
		link.MarkUnlinked(student, guardian, source);

		return link.DrainEvents().Single();
	}

	/// <summary>
	/// The same two students every time, so the roster and waiting-list runs of
	/// one event produce details that differ only where the source does.
	/// </summary>
	private static (Student Student, Student Sibling) SiblingGroup() =>
		(StudentFactory.Create(studentId: _studentId, firstName: "Amara", lastName: "Pillay"),
		 StudentFactory.Create(studentId: _siblingId, firstName: "Julian", lastName: "Thorne"));
}
