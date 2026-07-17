using Microsoft.Extensions.DependencyInjection;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Persistence.Interfaces;
using PanoramaMusic.Persistence.Tests.DomainEvents;
using PanoramaMusic.Persistence.Tests.Fixtures;
using PanoramaMusic.Persistence.Tests.Repository;
using PanoramaMusic.Persistence.Transactions;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Persistence.Tests;

/// <summary>
/// Proves the domain-event audit pipeline (collect → translate → flush) end
/// to end against a real Postgres transaction: a transactional-lane event
/// commits or rolls back with the business write, while a durable-lane event
/// survives a rollback.
/// </summary>
public class DomainEventAuditPipelineTests : IClassFixture<UnitOfWorkDatabaseFixture>
{
	private readonly UnitOfWorkDatabaseContext _context;
	private readonly IdentityAuditTrailTestReader _reader;

	public DomainEventAuditPipelineTests(UnitOfWorkDatabaseFixture fixture)
	{
		_context = fixture.CreateContext();
		_reader = _context.ServiceProvider.GetRequiredService<IdentityAuditTrailTestReader>();
	}

	[Fact]
	[Trait("AC", "186UC2")]
	public async Task FlushAsync_TransactionalLaneEventOnSuccessfulRequest_WritesExactlyOneAuditRecordInTheSameTransaction()
	{
		// Arrange
		var cancellationToken = TestContext.Current.CancellationToken;
		var actorId = Guid.NewGuid();
		var aggregate = new TestOrderAggregate();
		aggregate.PlaceOrder(actorId, "buyer@example.com");

		var unitOfWork = _context.ServiceProvider.GetRequiredService<IUnitOfWork>();
		var collector = _context.ServiceProvider.GetRequiredService<IDomainEventCollector>();
		var flushService = _context.ServiceProvider.GetRequiredService<IAuditFlushService>();

		// Act — mirrors what a repository does on save (drain into the
		// collector) and what UnitOfWorkMiddleware does before commit.
		await unitOfWork.BeginAsync(cancellationToken);
		collector.Collect(aggregate);
		await flushService.FlushAsync(cancellationToken);
		await unitOfWork.CommitAsync(cancellationToken);

		// Assert
		var count = await _reader.CountAsync("audit.audit_events", "actor_id", actorId, cancellationToken);
		count.ShouldBe(1);
	}

	[Fact]
	[Trait("AC", "186UC3")]
	public async Task FlushDurableAsync_TransactionalLaneEventOnFailedRequest_PersistsNoAuditRecord()
	{
		// Arrange
		var cancellationToken = TestContext.Current.CancellationToken;
		var actorId = Guid.NewGuid();
		var aggregate = new TestOrderAggregate();
		aggregate.PlaceOrder(actorId, "buyer@example.com");

		var unitOfWork = _context.ServiceProvider.GetRequiredService<IUnitOfWork>();
		var collector = _context.ServiceProvider.GetRequiredService<IDomainEventCollector>();
		var flushService = _context.ServiceProvider.GetRequiredService<IAuditFlushService>();

		// Act — mirrors UnitOfWorkMiddleware's catch branch: the transactional
		// event was collected but the request fails before FlushAsync/Commit
		// ever run, so the ambient transaction rolls back untouched.
		await unitOfWork.BeginAsync(cancellationToken);
		collector.Collect(aggregate);
		try
		{
			throw new InvalidOperationException("Simulated endpoint failure before commit.");
		}
		catch (InvalidOperationException)
		{
			await flushService.FlushDurableAsync(CancellationToken.None);
			await unitOfWork.RollbackAsync(cancellationToken);
		}

		// Assert
		var count = await _reader.CountAsync("audit.audit_events", "actor_id", actorId, cancellationToken);
		count.ShouldBe(0);
	}

	[Fact]
	[Trait("AC", "186UC4")]
	public async Task FlushDurableAsync_DurableLaneEventOnFailedRequest_PersistsTheAuditRecordDespiteTheRollback()
	{
		// Arrange
		var cancellationToken = TestContext.Current.CancellationToken;
		var actorId = Guid.NewGuid();
		var aggregate = new TestOrderAggregate();
		aggregate.RejectSecurityCheck(actorId, "attacker@example.com", "replay detected");

		var unitOfWork = _context.ServiceProvider.GetRequiredService<IUnitOfWork>();
		var collector = _context.ServiceProvider.GetRequiredService<IDomainEventCollector>();
		var flushService = _context.ServiceProvider.GetRequiredService<IAuditFlushService>();

		// Act — the security event must survive even though the ambient
		// transaction rolls back.
		await unitOfWork.BeginAsync(cancellationToken);
		collector.Collect(aggregate);
		try
		{
			throw new InvalidOperationException("Simulated rejected request.");
		}
		catch (InvalidOperationException)
		{
			await flushService.FlushDurableAsync(CancellationToken.None);
			await unitOfWork.RollbackAsync(cancellationToken);
		}

		// Assert
		var count = await _reader.CountAsync("audit.audit_events", "actor_id", actorId, cancellationToken);
		count.ShouldBe(1);

		var row = await _reader.FetchByActorAsync("test.security.rejected", actorId, cancellationToken);
		row.ShouldNotBeNull();
	}
}