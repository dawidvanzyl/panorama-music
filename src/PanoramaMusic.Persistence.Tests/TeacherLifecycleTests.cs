using Microsoft.Extensions.DependencyInjection;
using PanoramaMusic.Persistence.Tests.Fixtures;
using PanoramaMusic.Persistence.Tests.Repository;
using PanoramaMusic.Persistence.Transactions;
using PanoramaMusic.Teachers.Application.Commands.Banking;
using PanoramaMusic.Teachers.Application.Commands.Teachers;
using PanoramaMusic.Teachers.Application.Handlers.Banking;
using PanoramaMusic.Teachers.Application.Handlers.Teachers;
using PanoramaMusic.Teachers.Application.Requests.Banking;
using PanoramaMusic.Teachers.Domain.Entities;
using PanoramaMusic.Teachers.Domain.Enums;
using PanoramaMusic.Teachers.Domain.Interfaces;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Persistence.Tests;

/// <summary>
/// Deactivation pairs a state change with the deletion of the teacher's banking
/// details, and the two must succeed or fail together. Only a real transaction
/// over a real Postgres can show that: a mocked repository would happily report
/// whatever the test arranged, including a half-applied state the database
/// would never actually produce.
/// </summary>
public class TeacherLifecycleTests : IClassFixture<UnitOfWorkDatabaseFixture>
{
	private const string _accountNumber = "1234567890";
	private const string _last4 = "7890";

	private readonly UnitOfWorkDatabaseContext _context;
	private readonly TeacherTestReader _teacherReader;
	private readonly BankingDetailsTestReader _bankingReader;

	public TeacherLifecycleTests(UnitOfWorkDatabaseFixture fixture)
	{
		_context = fixture.CreateContext();
		_teacherReader = _context.ServiceProvider.GetRequiredService<TeacherTestReader>();
		_bankingReader = _context.ServiceProvider.GetRequiredService<BankingDetailsTestReader>();

		_context.Contexts.TeacherUserContextMock.SetupGet(m => m.UserId).Returns(Guid.NewGuid());
		_context.Contexts.TeacherUserContextMock.SetupGet(m => m.Email).Returns("admin-teacher-lifecycle@test.com");
	}

	[Fact]
	[Trait("AC", "234UC1")]
	public async Task DeactivateTeacher_TeacherWithBankingDetails_MarksThemInactiveAndDeletesTheDetailsInTheSameTransaction()
	{
		var cancellationToken = TestContext.Current.CancellationToken;
		var unitOfWork = _context.ServiceProvider.GetRequiredService<IUnitOfWork>();
		var handler = _context.ServiceProvider.GetRequiredService<DeactivateTeacherHandler>();

		await unitOfWork.BeginAsync(cancellationToken);
		var teacherId = await SeedTeacherAsync(cancellationToken);
		await CaptureBankingAsync(teacherId, cancellationToken);
		await unitOfWork.CommitAsync(cancellationToken);

		await unitOfWork.BeginAsync(cancellationToken);
		var result = await handler.HandleAsync(new DeactivateTeacherCommand(teacherId), cancellationToken);
		await unitOfWork.CommitAsync(cancellationToken);

		var storedTeacher = await _teacherReader.FetchAsync(teacherId, cancellationToken);
		var storedBanking = await _bankingReader.FetchAsync(teacherId, cancellationToken);

		storedTeacher.ShouldNotBeNull();
		ShouldlyHelpers.Satisfy(
			// The record survives deactivation — only deletion removes it.
			() => storedTeacher.TeacherId.ShouldBe(teacherId),
			() => storedTeacher.IsActive.ShouldBeFalse(),
			() => storedBanking.ShouldBeNull(),
			() => result.IsActive.ShouldBeFalse(),
			() => result.Banking.ShouldBeNull());
	}

	[Fact]
	[Trait("AC", "234UC2")]
	public async Task DeactivateTeacher_TransactionRolledBackAfterTheDetailsWereDeleted_LeavesThemPresentAndTheTeacherActive()
	{
		var cancellationToken = TestContext.Current.CancellationToken;
		var unitOfWork = _context.ServiceProvider.GetRequiredService<IUnitOfWork>();
		var handler = _context.ServiceProvider.GetRequiredService<DeactivateTeacherHandler>();

		// Committed first, so the rollback below can only be about the
		// deactivation — not about the teacher or the details never existing.
		await unitOfWork.BeginAsync(cancellationToken);
		var teacherId = await SeedTeacherAsync(cancellationToken);
		await CaptureBankingAsync(teacherId, cancellationToken);
		await unitOfWork.CommitAsync(cancellationToken);

		await unitOfWork.BeginAsync(cancellationToken);
		await handler.HandleAsync(new DeactivateTeacherCommand(teacherId), cancellationToken);
		await unitOfWork.RollbackAsync(cancellationToken);

		var storedTeacher = await _teacherReader.FetchAsync(teacherId, cancellationToken);
		var storedBanking = await _bankingReader.FetchAsync(teacherId, cancellationToken);

		storedTeacher.ShouldNotBeNull();
		storedBanking.ShouldNotBeNull();
		ShouldlyHelpers.Satisfy(
			// Neither half of the pair survives on its own: the details are still
			// there and the teacher is still active.
			() => storedTeacher.IsActive.ShouldBeTrue(),
			() => storedBanking.TeacherId.ShouldBe(teacherId),
			() => storedBanking.AccountNumberLast4.ShouldBe(_last4));
	}

	private async Task<Guid> SeedTeacherAsync(CancellationToken cancellationToken)
	{
		var teacherRepository = _context.ServiceProvider.GetRequiredService<ITeacherRepository>();
		var teacher = Teacher.Create(Guid.NewGuid(), "Thandi", "Mokoena", isPrivate: true);
		await teacherRepository.CreateAsync(teacher, cancellationToken);

		return teacher.TeacherId;
	}

	private async Task CaptureBankingAsync(Guid teacherId, CancellationToken cancellationToken)
	{
		await _context.ServiceProvider.GetRequiredService<CreateBankingDetailsHandler>()
			.HandleAsync(
				new CreateBankingDetailsCommand(
					teacherId,
					new CreateBankingDetailsRequest(Bank.StandardBank, BankAccountType.Savings, "051001", _accountNumber)),
				cancellationToken);
	}
}