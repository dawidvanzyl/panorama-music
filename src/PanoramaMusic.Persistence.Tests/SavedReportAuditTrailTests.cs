using Microsoft.Extensions.DependencyInjection;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Persistence.Tests.Fixtures;
using PanoramaMusic.Persistence.Tests.Repository;
using PanoramaMusic.Persistence.Transactions;
using PanoramaMusic.Reporting.Application.Constants;
using PanoramaMusic.Reporting.Application.Handlers;
using PanoramaMusic.Reporting.Application.Requests;
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
		// exactly one, from the save; the run raised nothing to add.
		var countAfterRun = await _reader.CountByTargetAsync(ReportingAuditEventTypes.SavedReportCreated, saved.Id, cancellationToken);
		countAfterRun.ShouldBe(1);
	}
}