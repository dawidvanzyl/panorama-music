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

public class SavedReportCreatedTranslatorTests
{
	private sealed record SomeOtherDomainEvent : IDomainEvent;


	private readonly Mock<IAuditContext> _auditContextMock = new();
	private readonly Mock<IUserContext> _userContextMock = new();

	private SavedReportCreatedTranslator CreateTranslator()
	{
		_auditContextMock.SetupGet(m => m.SourceIp).Returns("127.0.0.1");
		_auditContextMock.SetupGet(m => m.UserAgent).Returns("xunit");
		_auditContextMock.SetupGet(m => m.CorrelationId).Returns(Guid.NewGuid());
		_userContextMock.SetupGet(m => m.Email).Returns("teacher@test.com");

		return new SavedReportCreatedTranslator(_auditContextMock.Object, _userContextMock.Object);
	}

	[Fact]
	[Trait("AC", "321UC9")]
	public void Translate_SavedReportCreated_MapsTypeActorTargetLaneAndDisplay()
	{
		var reportId = Guid.NewGuid();
		var createdBy = Guid.NewGuid();
		var domainEvent = new SavedReportCreated(reportId, "Grade 4 Contacts", new StoredReportDefinition([], ["student.name"]), createdBy);
		var translator = CreateTranslator();

		var auditEvent = translator.Translate(domainEvent);

		translator.Lane.ShouldBe(AuditLane.Transactional);
		auditEvent.EventType.ShouldBe(ReportingAuditEventTypes.SavedReportCreated);
		auditEvent.ActorId.ShouldBe(createdBy);
		auditEvent.TargetId.ShouldBe(reportId);
		auditEvent.Outcome.ShouldBe("success");
		auditEvent.Detail["targetDisplay"].ShouldBe("Grade 4 Contacts");
	}

	[Fact]
	[Trait("AC", "321UC9")]
	public void CanTranslate_AnyOtherDomainEvent_ReturnsFalse()
	{
		var translator = CreateTranslator();

		translator.CanTranslate(new SomeOtherDomainEvent()).ShouldBeFalse();
	}
}
