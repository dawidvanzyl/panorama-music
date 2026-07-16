using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Audit.Infrastructure.Repositories;
using PanoramaMusic.Identity.Application.Handlers.Admin;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.ValueObjects;
using PanoramaMusic.Identity.Infrastructure.Repositories;
using PanoramaMusic.Persistence.Factories;
using PanoramaMusic.Persistence.Tests.Fixtures;
using PanoramaMusic.Persistence.Tests.Repository;
using PanoramaMusic.Persistence.Transactions;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Persistence.Tests;

public class UnitOfWorkAtomicityTests : IClassFixture<UnitOfWorkDatabaseFixture>
{
	private readonly UnitOfWorkDatabaseFixture _fixture;
	private readonly UnitOfWorkDatabaseContext _context;
	private readonly IdentityAuditTrailTestReader _identityAuditTrailTestReader;

	public UnitOfWorkAtomicityTests(UnitOfWorkDatabaseFixture fixture)
	{
		_fixture = fixture;
		_context = fixture.CreateContext();

		_identityAuditTrailTestReader = _context.ServiceProvider.GetRequiredService<IdentityAuditTrailTestReader>();
	}

	[Fact]
	[Trait("AC", "M1.5UC18")]
	public async Task GivenIdentityAndAuditWritesInOneUnitOfWork_WhenCommitted_ThenBothRowsArePersisted()
	{
		// Arrange
		var cancellationToken = TestContext.Current.CancellationToken;
		var user = CreateUser();
		var auditEvent = CreateAuditEvent();

		var unitOfWork = _context.ServiceProvider.GetRequiredService<IUnitOfWork>();
		var userRepository = _context.ServiceProvider.GetRequiredService<UserRepository>();
		var auditRepository = _context.ServiceProvider.GetRequiredService<AuditEventRepository>();

		// Act — both writes share the one transaction, committed as the
		// UnitOfWorkMiddleware would after a successful response.
		await unitOfWork.BeginAsync(cancellationToken);
		await userRepository.CreateAsync(user, cancellationToken);
		await auditRepository.CreateAsync(auditEvent, cancellationToken);
		await unitOfWork.CommitAsync(cancellationToken);

		// Assert
		var userCount = await _identityAuditTrailTestReader.CountAsync("identity.users", "user_id", user.UserId, cancellationToken);
		var auditEventCount = await _identityAuditTrailTestReader.CountAsync("audit.audit_events", "id", auditEvent.Id, cancellationToken);

		userCount.ShouldBe(1);
		auditEventCount.ShouldBe(1);
	}

	[Fact]
	[Trait("AC", "M1.5UC19")]
	public async Task GivenIdentityAndAuditWritesInOneUnitOfWork_WhenAnExceptionPrecedesCommit_ThenNeitherRowIsPersisted()
	{
		// Arrange
		var cancellationToken = TestContext.Current.CancellationToken;
		var user = CreateUser();
		var auditEvent = CreateAuditEvent();

		var unitOfWork = _context.ServiceProvider.GetRequiredService<IUnitOfWork>();
		var userRepository = _context.ServiceProvider.GetRequiredService<UserRepository>();
		var auditRepository = _context.ServiceProvider.GetRequiredService<AuditEventRepository>();

		// Act — an exception surfaces before CommitAsync, so the transaction is
		// rolled back as the UnitOfWorkMiddleware would on a failed request.
		await unitOfWork.BeginAsync(cancellationToken);
		try
		{
			await userRepository.CreateAsync(user, cancellationToken);
			await auditRepository.CreateAsync(auditEvent, cancellationToken);
			throw new InvalidOperationException("Simulated endpoint failure before commit.");
		}
		catch (InvalidOperationException)
		{
			await unitOfWork.RollbackAsync(cancellationToken);
		}

		var userCount = await _identityAuditTrailTestReader.CountAsync("identity.users", "user_id", user.UserId, cancellationToken);
		var auditEventCount = await _identityAuditTrailTestReader.CountAsync("audit.audit_events", "id", auditEvent.Id, cancellationToken);

		userCount.ShouldBe(0);
		auditEventCount.ShouldBe(0);
	}

	public static User CreateUser()
	{
		var user = new User(Guid.NewGuid(), Email.Create($"unit-of-work-{Guid.NewGuid()}@example.com"), DateTime.UtcNow);
		user.Activate();
		return user;
	}

	public static AuditEvent CreateAuditEvent() => new(
		Guid.NewGuid(),
		DateTime.UtcNow,
		"identity.user.created",
		null,
		null,
		null,
		"127.0.0.1",
		"xunit",
		Guid.NewGuid(),
		"success",
		null,
		new Dictionary<string, object?>());
}