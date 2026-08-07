using PanoramaMusic.Teachers.Domain.Events.Teachers;
using PanoramaMusic.Teachers.Domain.Exceptions;
using PanoramaMusic.Teachers.Domain.Messages;
using PanoramaMusic.Teachers.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Teachers.Tests.Domain;

/// <summary>
/// The two invariants the aggregate owns outright. Neither is reachable through
/// the API — the routes cannot ask for a relink or an empty unlink — so they are
/// covered here rather than end to end.
/// </summary>
public class TeacherAccountLinkTests
{
	[Fact]
	[Trait("AC", "232UC3")]
	public void LinkAccount_TeacherAlreadyLinked_IsRefusedAndKeepsTheOriginalLink()
	{
		var teacher = TeacherFactory.Create();
		var originalAccountId = Guid.NewGuid();
		teacher.LinkAccount(originalAccountId);

		var relink = () => teacher.LinkAccount(Guid.NewGuid());

		ShouldlyHelpers.Satisfy(
			() => relink.ShouldThrow<DomainException>().Message.ShouldBe(TeacherAccountLinkMessages.TeacherAlreadyLinked),
			() => teacher.LinkedAccountId.ShouldBe(originalAccountId));
	}

	[Fact]
	[Trait("AC", "232UC1")]
	public void LinkAccount_UnlinkedTeacher_SetsTheLinkAndRaisesTheEvent()
	{
		var teacher = TeacherFactory.Create();
		var accountId = Guid.NewGuid();

		teacher.LinkAccount(accountId);

		ShouldlyHelpers.Satisfy(
			() => teacher.LinkedAccountId.ShouldBe(accountId),
			() => teacher.DrainEvents().OfType<TeacherAccountLinked>().ShouldHaveSingleItem().AccountId.ShouldBe(accountId));
	}

	[Fact]
	[Trait("AC", "232UC4")]
	public void UnlinkAccount_TeacherWithoutALink_IsRefused()
	{
		var teacher = TeacherFactory.Create();

		var unlink = () => teacher.UnlinkAccount();

		unlink.ShouldThrow<DomainException>().Message.ShouldBe(TeacherAccountLinkMessages.TeacherNotLinked);
	}

	[Fact]
	[Trait("AC", "232UC4")]
	public void UnlinkAccount_LinkedTeacher_ClearsTheLinkAndKeepsTheRecordActive()
	{
		var teacher = TeacherFactory.Create();
		var accountId = Guid.NewGuid();
		teacher.LinkAccount(accountId);

		teacher.UnlinkAccount();

		ShouldlyHelpers.Satisfy(
			() => teacher.LinkedAccountId.ShouldBeNull(),
			() => teacher.IsActive.ShouldBeTrue(),
			() => teacher.DrainEvents().OfType<TeacherAccountUnlinked>().ShouldHaveSingleItem().PreviousAccountId.ShouldBe(accountId));
	}
}