using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.ValueObjects;
using PanoramaMusic.Identity.Infrastructure.Repositories;
using PanoramaMusic.Persistence.Tests.Fixtures;
using PanoramaMusic.Persistence.Transactions;
using PanoramaMusic.Teachers.Application.Handlers.Self;
using PanoramaMusic.Teachers.Domain.Entities;
using PanoramaMusic.Teachers.Domain.Exceptions;
using PanoramaMusic.Teachers.Domain.Interfaces;
using PanoramaMusic.Teachers.Domain.Messages;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Persistence.Tests;

/// <summary>
/// Self-service starts by finding the caller's record from their account id, and
/// that lookup is a database query rather than anything the domain can decide.
/// Only a real Postgres shows that the query matches on the link and on nothing
/// else — a mocked repository would return whatever the test handed it,
/// including for an account that claims no teacher at all.
/// </summary>
public class TeacherSelfServiceTests : IClassFixture<UnitOfWorkDatabaseFixture>
{
	private readonly UnitOfWorkDatabaseContext _context;

	public TeacherSelfServiceTests(UnitOfWorkDatabaseFixture fixture)
	{
		_context = fixture.CreateContext();
		_context.Contexts.TeacherUserContextMock.SetupGet(m => m.Email).Returns("teacher-self-service@test.com");
		_context.Directories.AccountDirectoryMock
			.Setup(m => m.GetEmailsAsync(It.IsAny<IReadOnlyCollection<Guid>>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync((IReadOnlyCollection<Guid> ids, CancellationToken _) =>
				ids.ToDictionary(id => id, _ => "teacher-self-service@test.com"));
	}

	[Fact]
	[Trait("AC", "235UC1")]
	public async Task GetOwnTeacher_AccountLinkedToATeacher_ResolvesThatTeacherAndNotAnotherOne()
	{
		var cancellationToken = TestContext.Current.CancellationToken;
		var unitOfWork = _context.ServiceProvider.GetRequiredService<IUnitOfWork>();

		await unitOfWork.BeginAsync(cancellationToken);
		var accountId = await SeedAccountAsync(cancellationToken);
		var teacherId = await SeedTeacherAsync("Thandi", "Mokoena", accountId, cancellationToken);
		// A second teacher, linked to a different account, sharing the table with
		// the first — the query has to pick between them rather than take whatever
		// row comes first.
		await SeedTeacherAsync("Sipho", "Nkosi", await SeedAccountAsync(cancellationToken), cancellationToken);
		await unitOfWork.CommitAsync(cancellationToken);

		_context.Contexts.TeacherUserContextMock.SetupGet(m => m.UserId).Returns(accountId);
		var handler = _context.ServiceProvider.GetRequiredService<GetOwnTeacherHandler>();

		await unitOfWork.BeginAsync(cancellationToken);
		var result = await handler.HandleAsync(cancellationToken);
		await unitOfWork.CommitAsync(cancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.TeacherId.ShouldBe(teacherId),
			() => result.FirstName.ShouldBe("Thandi"),
			() => result.LinkedAccountId.ShouldBe(accountId));
	}

	[Fact]
	[Trait("AC", "235UC8")]
	public async Task GetOwnTeacher_AccountLinkedToNoTeacher_IsRefusedRatherThanMatchingAnyRow()
	{
		var cancellationToken = TestContext.Current.CancellationToken;
		var unitOfWork = _context.ServiceProvider.GetRequiredService<IUnitOfWork>();

		// Teachers exist, including one with no link at all — the closest thing to
		// a row a badly written query could wrongly match on a null account id.
		await unitOfWork.BeginAsync(cancellationToken);
		await SeedTeacherAsync("Lerato", "Dube", await SeedAccountAsync(cancellationToken), cancellationToken);
		await SeedTeacherAsync("Kagiso", "Molefe", linkedAccountId: null, cancellationToken);
		await unitOfWork.CommitAsync(cancellationToken);

		_context.Contexts.TeacherUserContextMock.SetupGet(m => m.UserId).Returns(Guid.NewGuid());
		var handler = _context.ServiceProvider.GetRequiredService<GetOwnTeacherHandler>();

		await unitOfWork.BeginAsync(cancellationToken);
		var exception = await Should.ThrowAsync<EntityNotFoundException>(
			() => handler.HandleAsync(cancellationToken));
		await unitOfWork.CommitAsync(cancellationToken);

		exception.Message.ShouldBe(TeacherSelfServiceMessages.NoLinkedTeacher);
	}

	private async Task<Guid> SeedTeacherAsync(
		string firstName,
		string surname,
		Guid? linkedAccountId,
		CancellationToken cancellationToken)
	{
		var teacherRepository = _context.ServiceProvider.GetRequiredService<ITeacherRepository>();
		var teacher = Teacher.Create(Guid.NewGuid(), firstName, surname, isPrivate: false);

		if (linkedAccountId is not null)
			teacher.LinkAccount(linkedAccountId.Value);

		await teacherRepository.CreateAsync(teacher, cancellationToken);

		return teacher.TeacherId;
	}

	/// <summary>
	/// A teacher's linked account is a real foreign key into the Identity
	/// schema, so the account has to exist before anything can claim it.
	/// </summary>
	private async Task<Guid> SeedAccountAsync(CancellationToken cancellationToken)
	{
		var userRepository = _context.ServiceProvider.GetRequiredService<UserRepository>();
		var user = new User(Guid.NewGuid(), Email.Create($"teacher-self-service-{Guid.NewGuid()}@test.com"), DateTime.UtcNow);
		user.Activate();
		await userRepository.CreateAsync(user, cancellationToken);

		return user.UserId;
	}
}