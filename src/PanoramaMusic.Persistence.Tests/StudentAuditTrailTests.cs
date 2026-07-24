using Microsoft.Extensions.DependencyInjection;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain;
using PanoramaMusic.Persistence.Tests.Fixtures;
using PanoramaMusic.Persistence.Tests.Repository;
using PanoramaMusic.Persistence.Transactions;
using PanoramaMusic.Students.Application.Commands;
using PanoramaMusic.Students.Application.Constants;
using PanoramaMusic.Students.Application.Handlers;
using PanoramaMusic.Students.Application.Requests;
using PanoramaMusic.Students.Domain.Enums;
using Shouldly;
using System.Text.Json;
using Xunit;

namespace PanoramaMusic.Persistence.Tests;

/// <summary>
/// Drives the real Students handlers — and the real IStudentRepository, which is
/// where domain events get collected — against a real Postgres-backed IUnitOfWork,
/// then verifies the audit_events row that actually lands in the database. Unlike
/// Identity, Students never calls IAuditLogger directly, so each test also flushes
/// the collected domain events, mirroring what UnitOfWorkMiddleware does before commit.
/// </summary>
public class StudentAuditTrailTests : IClassFixture<UnitOfWorkDatabaseFixture>
{
	private readonly UnitOfWorkDatabaseContext _context;
	private readonly AuditTrailTestReader _reader;

	public StudentAuditTrailTests(UnitOfWorkDatabaseFixture fixture)
	{
		_context = fixture.CreateContext();
		_reader = _context.ServiceProvider.GetRequiredService<AuditTrailTestReader>();

		var actorId = Guid.NewGuid();
		_context.Contexts.StudentUserContextMock.SetupGet(m => m.UserId).Returns(actorId);
		_context.Contexts.StudentUserContextMock.SetupGet(m => m.Email).Returns("teacher-students-audit@test.com");
	}

	[Fact]
	[Trait("AC", "200UC1")]
	public async Task GivenCreateStudentSucceeds_WhenTheAuditEventIsFlushed_ThenTheRowContainsTheNewStudentIdAndDisplayName()
	{
		var cancellationToken = TestContext.Current.CancellationToken;
		var request = new CreateStudentRequest(
			"Amara", "Diallo", new DateOnly(2014, 5, 12), GradeType.Grade2, ClassType.A1, PhaseType.Junior, Language.English);

		var unitOfWork = _context.ServiceProvider.GetRequiredService<IUnitOfWork>();
		var flushService = _context.ServiceProvider.GetRequiredService<IAuditFlushService>();
		var handler = _context.ServiceProvider.GetRequiredService<CreateStudentHandler>();

		await unitOfWork.BeginAsync(cancellationToken);
		var created = await handler.HandleAsync(new CreateStudentCommand(request), cancellationToken);
		await flushService.FlushAsync(cancellationToken);
		await unitOfWork.CommitAsync(cancellationToken);

		var row = await _reader.FetchLatestByDetailContainsAsync(
			StudentAuditEventTypes.StudentCreated, created.StudentId.ToString(), cancellationToken);

		row.ShouldNotBeNull();
		row.TargetId.ShouldBeNull();
		row.Outcome.ShouldBe(AuditOutcomes.Success);
		using var detail = JsonDocument.Parse(row.Detail);
		detail.RootElement.GetProperty("studentId").GetGuid().ShouldBe(created.StudentId);
		detail.RootElement.GetProperty("targetDisplay").GetString().ShouldBe("Amara Diallo");
	}

	[Fact]
	[Trait("AC", "200UC3")]
	public async Task GivenUpdateStudentChangesOnlySomeFields_WhenTheAuditEventIsFlushed_ThenTheDetailDiffContainsOnlyTheChangedFields()
	{
		var cancellationToken = TestContext.Current.CancellationToken;
		var unitOfWork = _context.ServiceProvider.GetRequiredService<IUnitOfWork>();
		var flushService = _context.ServiceProvider.GetRequiredService<IAuditFlushService>();
		var createHandler = _context.ServiceProvider.GetRequiredService<CreateStudentHandler>();
		var updateHandler = _context.ServiceProvider.GetRequiredService<UpdateStudentHandler>();

		await unitOfWork.BeginAsync(cancellationToken);
		var created = await createHandler.HandleAsync(
			new CreateStudentCommand(new CreateStudentRequest(
				"Kwame", "Boateng", new DateOnly(2013, 9, 5), GradeType.Grade3, ClassType.A1, PhaseType.Junior, Language.English)),
			cancellationToken);
		await flushService.FlushAsync(cancellationToken);

		// Only grade changes; every other field is resubmitted unchanged.
		var updateRequest = new UpdateStudentRequest(
			created.FirstName, created.LastName, created.DateOfBirth, GradeType.Grade4, created.Class, created.Phase, created.Language);
		await updateHandler.HandleAsync(new UpdateStudentCommand(created.StudentId, updateRequest), cancellationToken);
		await flushService.FlushAsync(cancellationToken);
		await unitOfWork.CommitAsync(cancellationToken);

		var row = await _reader.FetchByTargetAsync(StudentAuditEventTypes.StudentUpdated, created.StudentId, cancellationToken);

		row.ShouldNotBeNull();
		using var detail = JsonDocument.Parse(row.Detail);
		var changes = detail.RootElement.GetProperty("changes");

		changes.TryGetProperty("grade", out var gradeChange).ShouldBeTrue();
		gradeChange.GetProperty("before").GetString().ShouldBe(GradeType.Grade3.ToString());
		gradeChange.GetProperty("after").GetString().ShouldBe(GradeType.Grade4.ToString());

		changes.TryGetProperty("firstName", out _).ShouldBeFalse();
		changes.TryGetProperty("lastName", out _).ShouldBeFalse();
		changes.TryGetProperty("dateOfBirth", out _).ShouldBeFalse();
		changes.TryGetProperty("class", out _).ShouldBeFalse();
		changes.TryGetProperty("phase", out _).ShouldBeFalse();
		changes.TryGetProperty("language", out _).ShouldBeFalse();
	}

	[Fact]
	[Trait("AC", "200UC4")]
	public async Task GivenDeleteStudentSucceeds_WhenTheAuditEventIsFlushed_ThenTheRowTargetsTheDeletedStudentWithItsDisplayName()
	{
		var cancellationToken = TestContext.Current.CancellationToken;
		var unitOfWork = _context.ServiceProvider.GetRequiredService<IUnitOfWork>();
		var flushService = _context.ServiceProvider.GetRequiredService<IAuditFlushService>();
		var createHandler = _context.ServiceProvider.GetRequiredService<CreateStudentHandler>();
		var deleteHandler = _context.ServiceProvider.GetRequiredService<DeleteStudentHandler>();

		await unitOfWork.BeginAsync(cancellationToken);
		var created = await createHandler.HandleAsync(
			new CreateStudentCommand(new CreateStudentRequest(
				"Fatima", "Nasser", new DateOnly(2012, 3, 20), GradeType.Grade5, ClassType.E1, PhaseType.Senior, Language.Afrikaans)),
			cancellationToken);
		await flushService.FlushAsync(cancellationToken);

		await deleteHandler.HandleAsync(new DeleteStudentCommand(created.StudentId), cancellationToken);
		await flushService.FlushAsync(cancellationToken);
		await unitOfWork.CommitAsync(cancellationToken);

		var row = await _reader.FetchByTargetAsync(StudentAuditEventTypes.StudentDeleted, created.StudentId, cancellationToken);

		row.ShouldNotBeNull();
		row.Outcome.ShouldBe(AuditOutcomes.Success);
		using var detail = JsonDocument.Parse(row.Detail);
		detail.RootElement.GetProperty("targetDisplay").GetString().ShouldBe("Fatima Nasser");
	}
}