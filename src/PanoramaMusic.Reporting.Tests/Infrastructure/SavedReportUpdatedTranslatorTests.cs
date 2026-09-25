using Moq;
using PanoramaMusic.Audit.Application.Enums;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Domain;
using PanoramaMusic.Reporting.Application.Constants;
using PanoramaMusic.Reporting.Application.Interfaces;
using PanoramaMusic.Reporting.Domain.Events;
using PanoramaMusic.Reporting.Domain.ValueObjects;
using PanoramaMusic.Reporting.Infrastructure.Translators;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Reporting.Tests.Infrastructure;

public class SavedReportUpdatedTranslatorTests
{
	private sealed record SomeOtherDomainEvent : IDomainEvent;

	private readonly Mock<IAuditContext> _auditContextMock = new();
	private readonly Mock<IUserContext> _userContextMock = new();
	private readonly Guid _actingUserId = Guid.NewGuid();

	private SavedReportUpdatedTranslator CreateTranslator()
	{
		_auditContextMock.SetupGet(m => m.SourceIp).Returns("127.0.0.1");
		_auditContextMock.SetupGet(m => m.UserAgent).Returns("xunit");
		_auditContextMock.SetupGet(m => m.CorrelationId).Returns(Guid.NewGuid());
		_userContextMock.SetupGet(m => m.UserId).Returns(_actingUserId);
		_userContextMock.SetupGet(m => m.Email).Returns("teacher@test.com");

		return new SavedReportUpdatedTranslator(_auditContextMock.Object, _userContextMock.Object);
	}

	[Fact]
	[Trait("AC", "322UC9")]
	public void Translate_SavedReportUpdated_MapsTypeActorTargetLaneAndDisplay()
	{
		var reportId = Guid.NewGuid();
		var creatorId = Guid.NewGuid();
		var domainEvent = new SavedReportUpdated(
			reportId,
			creatorId,
			"Grade 4 Contacts",
			new StoredReportDefinition([], ["student.name"]),
			"Grade 5 Contacts",
			new StoredReportDefinition([], ["student.name"]));
		var translator = CreateTranslator();

		var auditEvent = translator.Translate(domainEvent);

		ShouldlyHelpers.Satisfy(
			() => translator.Lane.ShouldBe(AuditLane.Transactional),
			() => auditEvent.EventType.ShouldBe(ReportingAuditEventTypes.SavedReportUpdated),
			() => auditEvent.ActorId.ShouldBe(_actingUserId),
			() => auditEvent.TargetId.ShouldBe(reportId),
			() => auditEvent.Outcome.ShouldBe("success"),
			() => auditEvent.Detail["targetDisplay"].ShouldBe("Grade 5 Contacts"));
	}

	[Fact]
	[Trait("AC", "322UC9")]
	public void Translate_NameChangedOnly_ChangesHoldOnlyName()
	{
		var domainEvent = new SavedReportUpdated(
			Guid.NewGuid(),
			Guid.NewGuid(),
			"Grade 4 Contacts",
			new StoredReportDefinition([], ["student.name"]),
			"Grade 5 Contacts",
			new StoredReportDefinition([], ["student.name"]));
		var translator = CreateTranslator();

		var auditEvent = translator.Translate(domainEvent);

		var changes = (Dictionary<string, object?>)auditEvent.Detail["changes"]!;
		changes.ShouldContainKey("name");
		changes.ShouldNotContainKey("definition");
	}

	[Fact]
	[Trait("AC", "322UC9")]
	public void Translate_DefinitionChangedOnly_ChangesHoldOnlyDefinition()
	{
		var domainEvent = new SavedReportUpdated(
			Guid.NewGuid(),
			Guid.NewGuid(),
			"Grade 4 Contacts",
			new StoredReportDefinition([], ["student.name"]),
			"Grade 4 Contacts",
			new StoredReportDefinition([], ["student.name", "student.gradeLevel"]));
		var translator = CreateTranslator();

		var auditEvent = translator.Translate(domainEvent);

		var changes = (Dictionary<string, object?>)auditEvent.Detail["changes"]!;
		changes.ShouldNotContainKey("name");
		changes.ShouldContainKey("definition");
	}

	[Fact]
	[Trait("AC", "322UC9")]
	public void CanTranslate_AnyOtherDomainEvent_ReturnsFalse()
	{
		var translator = CreateTranslator();

		translator.CanTranslate(new SomeOtherDomainEvent()).ShouldBeFalse();
	}
}
