using Npgsql;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Audit.Infrastructure.Repositories;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.ValueObjects;
using PanoramaMusic.Identity.Infrastructure.Repositories;
using PanoramaMusic.Persistence.Factories;
using PanoramaMusic.Persistence.Transactions;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Persistence.Tests.Transactions;

public class UnitOfWorkAtomicityTests(UnitOfWorkDatabaseFixture fixture) : IClassFixture<UnitOfWorkDatabaseFixture>
{
	[Fact]
	[Trait("AC", "M1.5UC18")]
	public async Task GivenIdentityAndAuditWritesInOneUnitOfWork_WhenCommitted_ThenBothRowsArePersisted()
	{
		// Arrange
		var cancellationToken = TestContext.Current.CancellationToken;
		var user = CreateUser();
		var auditEvent = CreateAuditEvent();
		await using var unitOfWork = new NpgsqlUnitOfWork(new NpgsqlConnectionFactory(fixture.ApplicationConnectionString));
		var userRepository = new UserRepository(unitOfWork);
		var auditRepository = new AuditEventRepository(unitOfWork);

		// Act — both writes share the one transaction, committed as the
		// UnitOfWorkMiddleware would after a successful response.
		await unitOfWork.BeginAsync(cancellationToken);
		await userRepository.CreateAsync(user, cancellationToken);
		await auditRepository.CreateAsync(auditEvent, cancellationToken);
		await unitOfWork.CommitAsync(cancellationToken);

		// Assert
		(await CountAsync("identity.users", "user_id", user.UserId, cancellationToken)).ShouldBe(1);
		(await CountAsync("audit.audit_events", "id", auditEvent.Id, cancellationToken)).ShouldBe(1);
	}

	[Fact]
	[Trait("AC", "M1.5UC19")]
	public async Task GivenIdentityAndAuditWritesInOneUnitOfWork_WhenAnExceptionPrecedesCommit_ThenNeitherRowIsPersisted()
	{
		// Arrange
		var cancellationToken = TestContext.Current.CancellationToken;
		var user = CreateUser();
		var auditEvent = CreateAuditEvent();
		await using var unitOfWork = new NpgsqlUnitOfWork(new NpgsqlConnectionFactory(fixture.ApplicationConnectionString));
		var userRepository = new UserRepository(unitOfWork);
		var auditRepository = new AuditEventRepository(unitOfWork);

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

		// Assert
		(await CountAsync("identity.users", "user_id", user.UserId, cancellationToken)).ShouldBe(0);
		(await CountAsync("audit.audit_events", "id", auditEvent.Id, cancellationToken)).ShouldBe(0);
	}

	private static User CreateUser()
	{
		var user = new User(Guid.NewGuid(), Email.Create($"unit-of-work-{Guid.NewGuid()}@example.com"), DateTime.UtcNow);
		user.Activate();
		return user;
	}

	private static AuditEvent CreateAuditEvent() => new(
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

	private async Task<long> CountAsync(string table, string idColumn, Guid id, CancellationToken cancellationToken)
	{
		await using var connection = new NpgsqlConnection(fixture.ApplicationConnectionString);
		await connection.OpenAsync(cancellationToken);
		await using var command = connection.CreateCommand();
		command.CommandText = $"SELECT count(*) FROM {table} WHERE {idColumn} = @id;";
		command.Parameters.AddWithValue("id", id);
		return (long)(await command.ExecuteScalarAsync(cancellationToken))!;
	}
}