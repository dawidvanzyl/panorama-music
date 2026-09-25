using Microsoft.Extensions.DependencyInjection;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Persistence.Tests.Fixtures;
using PanoramaMusic.Persistence.Tests.Repository;
using PanoramaMusic.Persistence.Transactions;
using PanoramaMusic.Reporting.Application.Constants;
using PanoramaMusic.Reporting.Application.Handlers;
using PanoramaMusic.Reporting.Application.Requests;
using PanoramaMusic.Reporting.Domain.Exceptions;
using Shouldly;
using System.Text.Json;
using Xunit;

namespace PanoramaMusic.Persistence.Tests;

/// <summary>
/// Drives the real SaveReportHandler and RunSavedReportHandler — and the real
/// ISavedReportRepository, where domain events are collected — against a
/// real Postgres-backed IUnitOfWork, then verifies the audit_events rows
/// that actually land in the database.
/// </summary>
public class SavedReportAuditTrailTests : IClassFixture<UnitOfWorkDatabaseFixture>
{
	private readonly UnitOfWorkDatabaseContext _context;
	private readonly AuditTrailTestReader _reader;

	public SavedReportAuditTrailTests(UnitOfWorkDatabaseFixture fixture)
	{
		_context = fixture.CreateContext();
		_reader = _context.ServiceProvider.GetRequiredService<AuditTrailTestReader>();

		var actorId = Guid.NewGuid();
		_context.Contexts.ReportingUserContextMock.SetupGet(m => m.UserId).Returns(actorId);
		_context.Contexts.ReportingUserContextMock.SetupGet(m => m.Email).Returns("teacher-reports-audit@test.com");
	}

	private static SaveReportRequest BuildSaveRequest(string name) =>
		new(name, new RunReportRequest([], ["student.name"]));

	[Fact]
	[Trait("AC", "321UC9")]
	public async Task GivenSaveReportSucceeds_WhenTheAuditEventIsFlushed_ThenTheRowNamesTheReportAndIsAttributedToTheSavingTeacher()
	{
		var cancellationToken = TestContext.Current.CancellationToken;
		var unitOfWork = _context.ServiceProvider.GetRequiredService<IUnitOfWork>();
		var flushService = _context.ServiceProvider.GetRequiredService<IAuditFlushService>();
		var handler = _context.ServiceProvider.GetRequiredService<SaveReportHandler>();

		await unitOfWork.BeginAsync(cancellationToken);
		var saved = await handler.HandleAsync(BuildSaveRequest("Grade 4 Contacts"), cancellationToken);
		await flushService.FlushAsync(cancellationToken);
		await unitOfWork.CommitAsync(cancellationToken);

		var row = await _reader.FetchByTargetAsync(ReportingAuditEventTypes.SavedReportCreated, saved.Id, cancellationToken);

		row.ShouldNotBeNull();
		row.ActorId.ShouldBe(_context.Contexts.ReportingUserContextMock.Object.UserId);
		row.Outcome.ShouldBe("success");
		using var detail = JsonDocument.Parse(row.Detail);
		detail.RootElement.GetProperty("targetDisplay").GetString().ShouldBe("Grade 4 Contacts");
	}

	[Fact]
	[Trait("AC", "321UC10")]
	public async Task GivenASavedReport_WhenItIsRun_ThenNoNewAuditEventIsRecorded()
	{
		var cancellationToken = TestContext.Current.CancellationToken;
		var unitOfWork = _context.ServiceProvider.GetRequiredService<IUnitOfWork>();
		var flushService = _context.ServiceProvider.GetRequiredService<IAuditFlushService>();
		var saveHandler = _context.ServiceProvider.GetRequiredService<SaveReportHandler>();
		var runHandler = _context.ServiceProvider.GetRequiredService<RunSavedReportHandler>();

		await unitOfWork.BeginAsync(cancellationToken);
		var saved = await saveHandler.HandleAsync(BuildSaveRequest("Grade 5 Contacts"), cancellationToken);
		await flushService.FlushAsync(cancellationToken);

		await runHandler.HandleAsync(saved.Id, cancellationToken);
		await flushService.FlushAsync(cancellationToken);
		await unitOfWork.CommitAsync(cancellationToken);

		// Reads over its own connection, so it only ever sees committed rows —
		// exactly one, from the save; the run raised nothing to add, of any
		// event type.
		var countAfterRun = await _reader.CountAsync("audit.audit_events", "target_id", saved.Id, cancellationToken);
		countAfterRun.ShouldBe(1);
	}

	[Fact]
	[Trait("AC", "322UC9")]
	public async Task GivenASavedReport_WhenItsCreatorUpdatesIt_ThenAnUpdatedRowNamesTheReportAndIsAttributedToTheActingTeacher()
	{
		var cancellationToken = TestContext.Current.CancellationToken;
		var unitOfWork = _context.ServiceProvider.GetRequiredService<IUnitOfWork>();
		var flushService = _context.ServiceProvider.GetRequiredService<IAuditFlushService>();
		var saveHandler = _context.ServiceProvider.GetRequiredService<SaveReportHandler>();
		var updateHandler = _context.ServiceProvider.GetRequiredService<UpdateSavedReportHandler>();

		await unitOfWork.BeginAsync(cancellationToken);
		var saved = await saveHandler.HandleAsync(BuildSaveRequest("Grade 4 Contacts"), cancellationToken);
		await flushService.FlushAsync(cancellationToken);

		await updateHandler.HandleAsync(saved.Id, BuildSaveRequest("Grade 5 Contacts"), cancellationToken);
		await flushService.FlushAsync(cancellationToken);
		await unitOfWork.CommitAsync(cancellationToken);

		var row = await _reader.FetchByTargetAsync(ReportingAuditEventTypes.SavedReportUpdated, saved.Id, cancellationToken);

		row.ShouldNotBeNull();
		row.ActorId.ShouldBe(_context.Contexts.ReportingUserContextMock.Object.UserId);
		row.Outcome.ShouldBe("success");
		using var detail = JsonDocument.Parse(row.Detail);
		detail.RootElement.GetProperty("targetDisplay").GetString().ShouldBe("Grade 5 Contacts");
	}

	[Fact]
	[Trait("AC", "322UC9")]
	public async Task GivenASavedReport_WhenItsCreatorDeletesIt_ThenADeletedRowNamesTheReportAndIsAttributedToTheActingTeacher()
	{
		var cancellationToken = TestContext.Current.CancellationToken;
		var unitOfWork = _context.ServiceProvider.GetRequiredService<IUnitOfWork>();
		var flushService = _context.ServiceProvider.GetRequiredService<IAuditFlushService>();
		var saveHandler = _context.ServiceProvider.GetRequiredService<SaveReportHandler>();
		var deleteHandler = _context.ServiceProvider.GetRequiredService<DeleteSavedReportHandler>();

		await unitOfWork.BeginAsync(cancellationToken);
		var saved = await saveHandler.HandleAsync(BuildSaveRequest("Grade 6 Contacts"), cancellationToken);
		await flushService.FlushAsync(cancellationToken);

		await deleteHandler.HandleAsync(saved.Id, cancellationToken);
		await flushService.FlushAsync(cancellationToken);
		await unitOfWork.CommitAsync(cancellationToken);

		var row = await _reader.FetchByTargetAsync(ReportingAuditEventTypes.SavedReportDeleted, saved.Id, cancellationToken);

		row.ShouldNotBeNull();
		row.ActorId.ShouldBe(_context.Contexts.ReportingUserContextMock.Object.UserId);
		row.Outcome.ShouldBe("success");
		using var detail = JsonDocument.Parse(row.Detail);
		detail.RootElement.GetProperty("targetDisplay").GetString().ShouldBe("Grade 6 Contacts");
	}

	[Fact]
	[Trait("AC", "322UC10")]
	public async Task GivenASavedReport_WhenANonCreatorsUpdateOrDeleteIsForbidden_ThenNoReportAuditRowIsAddedBeyondTheCreate()
	{
		var cancellationToken = TestContext.Current.CancellationToken;
		var unitOfWork = _context.ServiceProvider.GetRequiredService<IUnitOfWork>();
		var flushService = _context.ServiceProvider.GetRequiredService<IAuditFlushService>();
		var saveHandler = _context.ServiceProvider.GetRequiredService<SaveReportHandler>();
		var updateHandler = _context.ServiceProvider.GetRequiredService<UpdateSavedReportHandler>();
		var deleteHandler = _context.ServiceProvider.GetRequiredService<DeleteSavedReportHandler>();

		await unitOfWork.BeginAsync(cancellationToken);
		var saved = await saveHandler.HandleAsync(BuildSaveRequest("Grade 7 Contacts"), cancellationToken);
		await flushService.FlushAsync(cancellationToken);
		await unitOfWork.CommitAsync(cancellationToken);

		_context.Contexts.ReportingUserContextMock.SetupGet(m => m.UserId).Returns(Guid.NewGuid());
		_context.Contexts.ReportingUserContextMock.SetupGet(m => m.Email).Returns("other-teacher@test.com");

		await unitOfWork.BeginAsync(cancellationToken);
		await Should.ThrowAsync<ForbiddenException>(
			() => updateHandler.HandleAsync(saved.Id, BuildSaveRequest("Hijacked"), cancellationToken));
		await Should.ThrowAsync<ForbiddenException>(
			() => deleteHandler.HandleAsync(saved.Id, cancellationToken));
		await flushService.FlushAsync(cancellationToken);
		await unitOfWork.CommitAsync(cancellationToken);

		var count = await _reader.CountAsync("audit.audit_events", "target_id", saved.Id, cancellationToken);
		count.ShouldBe(1);
	}
}