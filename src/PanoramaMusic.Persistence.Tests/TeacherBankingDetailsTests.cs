using Microsoft.Extensions.DependencyInjection;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Persistence.Tests.Fixtures;
using PanoramaMusic.Persistence.Tests.Repository;
using PanoramaMusic.Persistence.Transactions;
using PanoramaMusic.Teachers.Application.Commands.Banking;
using PanoramaMusic.Teachers.Application.Constants;
using PanoramaMusic.Teachers.Application.Handlers.Banking;
using PanoramaMusic.Teachers.Application.Requests.Banking;
using PanoramaMusic.Teachers.Domain.Entities;
using PanoramaMusic.Teachers.Domain.Enums;
using PanoramaMusic.Teachers.Domain.Exceptions;
using PanoramaMusic.Teachers.Domain.Interfaces;
using Shouldly;
using System.Text.Json;
using Xunit;

namespace PanoramaMusic.Persistence.Tests;

/// <summary>
/// Drives the real banking handlers, the real repository — which is where the
/// account number is protected and where banking domain events are collected —
/// and the real Data Protection keyring against a real Postgres, then inspects
/// what actually lands in the table and in audit_events. A stand-in protector
/// or repository would leave the very properties these tests exist to prove
/// untested.
/// </summary>
public class TeacherBankingDetailsTests : IClassFixture<UnitOfWorkDatabaseFixture>
{
	private const string _accountNumber = "1234567890";
	private const string _last4 = "7890";
	private const string _actorEmail = "admin-banking-audit@test.com";

	private readonly UnitOfWorkDatabaseContext _context;
	private readonly AuditTrailTestReader _auditReader;
	private readonly BankingDetailsTestReader _bankingReader;

	public TeacherBankingDetailsTests(UnitOfWorkDatabaseFixture fixture)
	{
		_context = fixture.CreateContext();
		_auditReader = _context.ServiceProvider.GetRequiredService<AuditTrailTestReader>();
		_bankingReader = _context.ServiceProvider.GetRequiredService<BankingDetailsTestReader>();

		_context.Contexts.TeacherUserContextMock.SetupGet(m => m.UserId).Returns(Guid.NewGuid());
		_context.Contexts.TeacherUserContextMock.SetupGet(m => m.Email).Returns(_actorEmail);
	}

	[Fact]
	[Trait("AC", "233UC1")]
	public async Task CreateBankingDetails_TeacherWithNoneThenASecondAttempt_PersistsOneRecordAndRejectsTheSecond()
	{
		var cancellationToken = TestContext.Current.CancellationToken;
		var unitOfWork = _context.ServiceProvider.GetRequiredService<IUnitOfWork>();
		var handler = _context.ServiceProvider.GetRequiredService<CreateBankingDetailsHandler>();

		await unitOfWork.BeginAsync(cancellationToken);
		var teacherId = await SeedTeacherAsync(isPrivate: true, cancellationToken);

		await handler.HandleAsync(new CreateBankingDetailsCommand(teacherId, CreateRequest()), cancellationToken);

		var secondAttempt = await Should.ThrowAsync<DomainException>(
			() => handler.HandleAsync(new CreateBankingDetailsCommand(teacherId, CreateRequest()), cancellationToken));

		await unitOfWork.CommitAsync(cancellationToken);

		var stored = await _bankingReader.FetchAsync(teacherId, cancellationToken);

		stored.ShouldNotBeNull();
		ShouldlyHelpers.Satisfy(
			() => stored.TeacherId.ShouldBe(teacherId),
			() => stored.AccountNumberLast4.ShouldBe(_last4),
			() => secondAttempt.Message.ShouldNotContain(_accountNumber));
	}

	[Fact]
	[Trait("AC", "233UC2")]
	public async Task CreateBankingDetails_RowReadDirectlyFromTheDatabase_HoldsAProtectedPayloadAndNoPlaintextAccountNumber()
	{
		var cancellationToken = TestContext.Current.CancellationToken;
		var unitOfWork = _context.ServiceProvider.GetRequiredService<IUnitOfWork>();
		var handler = _context.ServiceProvider.GetRequiredService<CreateBankingDetailsHandler>();

		await unitOfWork.BeginAsync(cancellationToken);
		var teacherId = await SeedTeacherAsync(isPrivate: true, cancellationToken);
		await handler.HandleAsync(new CreateBankingDetailsCommand(teacherId, CreateRequest()), cancellationToken);
		await unitOfWork.CommitAsync(cancellationToken);

		var stored = await _bankingReader.FetchAsync(teacherId, cancellationToken);

		stored.ShouldNotBeNull();
		ShouldlyHelpers.Satisfy(
			() => stored.AccountNumberProtected.ShouldNotBeNullOrWhiteSpace(),
			() => stored.AccountNumberProtected.ShouldNotBe(_accountNumber),
			// No column anywhere on the row holds the number — not just the one
			// meant to hold the protected form.
			() => stored.AllColumns.ShouldNotContain(_accountNumber));
	}

	[Fact]
	[Trait("AC", "233UC7")]
	public async Task CreateBankingDetails_SchoolPaidTeacher_Succeeds()
	{
		var cancellationToken = TestContext.Current.CancellationToken;
		var unitOfWork = _context.ServiceProvider.GetRequiredService<IUnitOfWork>();
		var handler = _context.ServiceProvider.GetRequiredService<CreateBankingDetailsHandler>();

		await unitOfWork.BeginAsync(cancellationToken);
		var teacherId = await SeedTeacherAsync(isPrivate: false, cancellationToken);

		var result = await handler.HandleAsync(new CreateBankingDetailsCommand(teacherId, CreateRequest()), cancellationToken);
		await unitOfWork.CommitAsync(cancellationToken);

		var stored = await _bankingReader.FetchAsync(teacherId, cancellationToken);

		stored.ShouldNotBeNull();
		result.AccountNumberLast4.ShouldBe(_last4);
	}

	[Fact]
	[Trait("AC", "233UC8")]
	public async Task BankingOperations_CreateAmendRevealAndDelete_EachProduceAnAuditRecordNamingTheActorTheTeacherAndTheAction()
	{
		var cancellationToken = TestContext.Current.CancellationToken;
		var actorId = Guid.NewGuid();
		_context.Contexts.TeacherUserContextMock.SetupGet(m => m.UserId).Returns(actorId);

		var unitOfWork = _context.ServiceProvider.GetRequiredService<IUnitOfWork>();
		var flushService = _context.ServiceProvider.GetRequiredService<IAuditFlushService>();

		await unitOfWork.BeginAsync(cancellationToken);
		var teacherId = await SeedTeacherAsync(isPrivate: true, cancellationToken);

		await _context.ServiceProvider.GetRequiredService<CreateBankingDetailsHandler>()
			.HandleAsync(new CreateBankingDetailsCommand(teacherId, CreateRequest()), cancellationToken);
		await _context.ServiceProvider.GetRequiredService<UpdateBankingDetailsHandler>()
			.HandleAsync(new UpdateBankingDetailsCommand(teacherId, new UpdateBankingDetailsRequest(Bank.Capitec, BankAccountType.ChequeCurrent, "470010", null)), cancellationToken);
		await _context.ServiceProvider.GetRequiredService<RevealAccountNumberHandler>()
			.HandleAsync(new RevealAccountNumberCommand(teacherId), cancellationToken);
		await _context.ServiceProvider.GetRequiredService<DeleteBankingDetailsHandler>()
			.HandleAsync(new DeleteBankingDetailsCommand(teacherId), cancellationToken);

		await flushService.FlushAsync(cancellationToken);
		await unitOfWork.CommitAsync(cancellationToken);

		var captured = await _auditReader.FetchByTargetAsync(TeacherAuditEventTypes.BankingDetailsCaptured, teacherId, cancellationToken);
		var amended = await _auditReader.FetchByTargetAsync(TeacherAuditEventTypes.BankingDetailsAmended, teacherId, cancellationToken);
		var revealed = await _auditReader.FetchByTargetAsync(TeacherAuditEventTypes.BankingDetailsRevealed, teacherId, cancellationToken);
		var deleted = await _auditReader.FetchByTargetAsync(TeacherAuditEventTypes.BankingDetailsDeleted, teacherId, cancellationToken);

		ShouldlyHelpers.Satisfy(
			() => captured.ShouldNotBeNull().ActorEmail.ShouldBe(_actorEmail),
			() => captured.ShouldNotBeNull().ActorId.ShouldBe(actorId),
			() => amended.ShouldNotBeNull().TargetId.ShouldBe(teacherId),
			() => revealed.ShouldNotBeNull().TargetId.ShouldBe(teacherId),
			() => deleted.ShouldNotBeNull().ActorEmail.ShouldBe(_actorEmail));
	}

	[Fact]
	[Trait("AC", "233UC9")]
	public async Task BankingAuditRecord_DetailPayloadInspected_CarriesOnlyTheLastFourDigitsAndNoBeforeOrAfterValues()
	{
		var cancellationToken = TestContext.Current.CancellationToken;
		var unitOfWork = _context.ServiceProvider.GetRequiredService<IUnitOfWork>();
		var flushService = _context.ServiceProvider.GetRequiredService<IAuditFlushService>();

		await unitOfWork.BeginAsync(cancellationToken);
		var teacherId = await SeedTeacherAsync(isPrivate: true, cancellationToken);

		await _context.ServiceProvider.GetRequiredService<CreateBankingDetailsHandler>()
			.HandleAsync(new CreateBankingDetailsCommand(teacherId, CreateRequest()), cancellationToken);

		// An edit that moves the bank, the branch code and the number but leaves
		// the account type alone: the case a before/after diff would show up in,
		// and the one that proves an unchanged field is omitted rather than
		// recorded. The seeded account type is Savings, so passing it again is
		// genuinely "unchanged".
		await _context.ServiceProvider.GetRequiredService<UpdateBankingDetailsHandler>()
			.HandleAsync(new UpdateBankingDetailsCommand(teacherId, new UpdateBankingDetailsRequest(Bank.Absa, BankAccountType.Savings, "632005", "9999888877")), cancellationToken);

		await flushService.FlushAsync(cancellationToken);
		await unitOfWork.CommitAsync(cancellationToken);

		var stored = await _bankingReader.FetchAsync(teacherId, cancellationToken);
		var amended = await _auditReader.FetchByTargetAsync(TeacherAuditEventTypes.BankingDetailsAmended, teacherId, cancellationToken);

		amended.ShouldNotBeNull();
		stored.ShouldNotBeNull();
		using var detail = JsonDocument.Parse(amended.Detail);

		var changes = detail.RootElement.GetProperty("changes");

		ShouldlyHelpers.Satisfy(
			() => detail.RootElement.GetProperty("accountNumberLast4").GetString().ShouldBe("8877"),
			// Which fields moved, as flags — never what they moved from or to.
			() => changes.GetProperty("bankChanged").GetBoolean().ShouldBeTrue(),
			() => changes.GetProperty("branchCodeChanged").GetBoolean().ShouldBeTrue(),
			() => changes.GetProperty("accountNumberChanged").GetBoolean().ShouldBeTrue(),
			// The account type did not change, so it is absent rather than false.
			() => changes.TryGetProperty("accountTypeChanged", out _).ShouldBeFalse(),
			// Exactly the three fields that moved, and nothing else.
			() => changes.EnumerateObject().Count().ShouldBe(3),
			// The detail bag is the last four digits and the changes bag, no more.
			() => detail.RootElement.EnumerateObject().Count().ShouldBe(2),
			// Every value in the changes bag is a boolean — no banking value of
			// any kind can reach it.
			() => changes.EnumerateObject()
				.All(property => property.Value.ValueKind == JsonValueKind.True)
				.ShouldBeTrue(),
			() => amended.Detail.ShouldNotContain("9999888877"),
			() => amended.Detail.ShouldNotContain(_accountNumber),
			() => amended.Detail.ShouldNotContain(stored.AccountNumberProtected),
			() => amended.Detail.ShouldNotContain("632005"),
			() => amended.Detail.ShouldNotContain("051001"),
			() => amended.Detail.ShouldNotContain("Absa"),
			() => amended.Detail.ShouldNotContain("before"),
			() => amended.Detail.ShouldNotContain("after"));
	}

	[Fact]
	[Trait("AC", "233UC11")]
	public async Task CreateBankingDetails_TransactionRolledBack_CommitsNeitherTheRecordNorAnAuditEntry()
	{
		var cancellationToken = TestContext.Current.CancellationToken;
		var unitOfWork = _context.ServiceProvider.GetRequiredService<IUnitOfWork>();
		var flushService = _context.ServiceProvider.GetRequiredService<IAuditFlushService>();
		var handler = _context.ServiceProvider.GetRequiredService<CreateBankingDetailsHandler>();

		// The teacher is committed first so the rollback below can only be about
		// the banking write, not about the teacher disappearing with it.
		await unitOfWork.BeginAsync(cancellationToken);
		var teacherId = await SeedTeacherAsync(isPrivate: true, cancellationToken);
		await unitOfWork.CommitAsync(cancellationToken);

		await unitOfWork.BeginAsync(cancellationToken);
		await handler.HandleAsync(new CreateBankingDetailsCommand(teacherId, CreateRequest()), cancellationToken);
		await flushService.FlushAsync(cancellationToken);
		await unitOfWork.RollbackAsync(cancellationToken);

		var stored = await _bankingReader.FetchAsync(teacherId, cancellationToken);
		var auditCount = await _auditReader.CountByTargetAsync(TeacherAuditEventTypes.BankingDetailsCaptured, teacherId, cancellationToken);

		ShouldlyHelpers.Satisfy(
			() => stored.ShouldBeNull(),
			() => auditCount.ShouldBe(0));
	}

	private static CreateBankingDetailsRequest CreateRequest() =>
		new(Bank.StandardBank, BankAccountType.Savings, "051001", _accountNumber);

	/// <summary>
	/// Writes a teacher through the real repository so the banking record has a
	/// genuine row to reference. The teacher's own created event is drained by
	/// the repository into the collector; tests that assert on banking audit
	/// rows read them by event type, so it does not interfere.
	/// </summary>
	private async Task<Guid> SeedTeacherAsync(bool isPrivate, CancellationToken cancellationToken)
	{
		var teacherRepository = _context.ServiceProvider.GetRequiredService<ITeacherRepository>();
		var teacher = Teacher.Create(Guid.NewGuid(), "Thandi", "Mokoena", isPrivate);
		await teacherRepository.CreateAsync(teacher, cancellationToken);

		return teacher.TeacherId;
	}
}