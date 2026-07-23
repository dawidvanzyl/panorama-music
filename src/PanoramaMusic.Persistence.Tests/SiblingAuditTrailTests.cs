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
/// Drives the real AddSibling/RemoveSibling handlers — and the real ISiblingRepository,
/// which is where domain events get collected — against a real Postgres-backed
/// IUnitOfWork, then verifies the audit_events row that actually lands in the
/// database. Mirrors StudentAuditTrailTests; see that class for why each test flushes
/// explicitly before commit.
/// </summary>
public class SiblingAuditTrailTests : IClassFixture<UnitOfWorkDatabaseFixture>
{
	private readonly UnitOfWorkDatabaseContext _context;
	private readonly AuditTrailTestReader _reader;

	public SiblingAuditTrailTests(UnitOfWorkDatabaseFixture fixture)
	{
		_context = fixture.CreateContext();
		_reader = _context.ServiceProvider.GetRequiredService<AuditTrailTestReader>();

		var actorId = Guid.NewGuid();
		_context.Contexts.StudentUserContextMock.SetupGet(m => m.UserId).Returns(actorId);
		_context.Contexts.StudentUserContextMock.SetupGet(m => m.Email).Returns("teacher-siblings-audit@test.com");
	}

	[Fact]
	[Trait("AC", "201UC1")]
	public async Task GivenAddSiblingSucceeds_WhenTheAuditEventIsFlushed_ThenTheRowTargetsTheStudentWithBothDisplayNames()
	{
		var cancellationToken = TestContext.Current.CancellationToken;
		var unitOfWork = _context.ServiceProvider.GetRequiredService<IUnitOfWork>();
		var flushService = _context.ServiceProvider.GetRequiredService<IAuditFlushService>();
		var createHandler = _context.ServiceProvider.GetRequiredService<CreateStudentHandler>();
		var addSiblingHandler = _context.ServiceProvider.GetRequiredService<AddSiblingHandler>();

		await unitOfWork.BeginAsync(cancellationToken);
		var student = await createHandler.HandleAsync(
			new CreateStudentCommand(new CreateStudentRequest(
				"Zanele", "Mokoena", new DateOnly(2014, 4, 1), GradeType.Grade4, ClassType.A1, PhaseType.Junior, Language.English)),
			cancellationToken);
		var sibling = await createHandler.HandleAsync(
			new CreateStudentCommand(new CreateStudentRequest(
				"Tumi", "Mokoena", new DateOnly(2012, 6, 15), GradeType.Grade6, ClassType.A1, PhaseType.Junior, Language.English)),
			cancellationToken);
		await flushService.FlushAsync(cancellationToken);

		await addSiblingHandler.HandleAsync(new AddSiblingCommand(student.StudentId, sibling.StudentId), cancellationToken);
		await flushService.FlushAsync(cancellationToken);
		await unitOfWork.CommitAsync(cancellationToken);

		var row = await _reader.FetchByTargetAsync(StudentAuditEventTypes.SiblingAdded, student.StudentId, cancellationToken);

		row.ShouldNotBeNull();
		row.Outcome.ShouldBe(AuditOutcomes.Success);
		using var detail = JsonDocument.Parse(row.Detail);
		detail.RootElement.GetProperty("siblingId").GetGuid().ShouldBe(sibling.StudentId);
		detail.RootElement.GetProperty("targetDisplay").GetString().ShouldBe("Zanele Mokoena ↔ Tumi Mokoena");
	}

	[Fact]
	[Trait("AC", "201UC3")]
	public async Task GivenRemoveSiblingSucceeds_WhenTheAuditEventIsFlushed_ThenTheRowTargetsTheStudentWithBothDisplayNames()
	{
		var cancellationToken = TestContext.Current.CancellationToken;
		var unitOfWork = _context.ServiceProvider.GetRequiredService<IUnitOfWork>();
		var flushService = _context.ServiceProvider.GetRequiredService<IAuditFlushService>();
		var createHandler = _context.ServiceProvider.GetRequiredService<CreateStudentHandler>();
		var addSiblingHandler = _context.ServiceProvider.GetRequiredService<AddSiblingHandler>();
		var removeSiblingHandler = _context.ServiceProvider.GetRequiredService<RemoveSiblingHandler>();

		await unitOfWork.BeginAsync(cancellationToken);
		var student = await createHandler.HandleAsync(
			new CreateStudentCommand(new CreateStudentRequest(
				"Bongani", "Sithole", new DateOnly(2013, 8, 20), GradeType.Grade5, ClassType.E1, PhaseType.Senior, Language.Afrikaans)),
			cancellationToken);
		var sibling = await createHandler.HandleAsync(
			new CreateStudentCommand(new CreateStudentRequest(
				"Ayanda", "Sithole", new DateOnly(2011, 2, 10), GradeType.Grade7, ClassType.E1, PhaseType.Senior, Language.Afrikaans)),
			cancellationToken);
		await addSiblingHandler.HandleAsync(new AddSiblingCommand(student.StudentId, sibling.StudentId), cancellationToken);
		await flushService.FlushAsync(cancellationToken);

		await removeSiblingHandler.HandleAsync(new RemoveSiblingCommand(student.StudentId, sibling.StudentId), cancellationToken);
		await flushService.FlushAsync(cancellationToken);
		await unitOfWork.CommitAsync(cancellationToken);

		var row = await _reader.FetchByTargetAsync(StudentAuditEventTypes.SiblingRemoved, student.StudentId, cancellationToken);

		row.ShouldNotBeNull();
		row.Outcome.ShouldBe(AuditOutcomes.Success);
		using var detail = JsonDocument.Parse(row.Detail);
		detail.RootElement.GetProperty("siblingId").GetGuid().ShouldBe(sibling.StudentId);
		detail.RootElement.GetProperty("targetDisplay").GetString().ShouldBe("Bongani Sithole ↔ Ayanda Sithole");
	}
}