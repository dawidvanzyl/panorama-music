using Microsoft.Extensions.DependencyInjection;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Infrastructure.Repositories;
using PanoramaMusic.Persistence.Tests.Fixtures;
using PanoramaMusic.Persistence.Tests.Repository;
using PanoramaMusic.Persistence.Transactions;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Persistence.Tests;

/// <summary>
/// Exercises RevokedAccessTokenRepository.CreateManyAsync against a real Postgres
/// instance to verify the identity.revoked_access_token_input composite-array
/// parameter round-trips through Dapper/Npgsql correctly — the codebase has direct
/// precedent (see #164) for this kind of mapping failing in ways code review alone
/// does not catch.
/// </summary>
public class RevokedAccessTokenRepositoryTests : IClassFixture<UnitOfWorkDatabaseFixture>
{
	private readonly UnitOfWorkDatabaseContext _context;
	private readonly RevokedAccessTokenTestReader _reader;

	public RevokedAccessTokenRepositoryTests(UnitOfWorkDatabaseFixture fixture)
	{
		_context = fixture.CreateContext();
		_reader = _context.ServiceProvider.GetRequiredService<RevokedAccessTokenTestReader>();
	}

	[Fact]
	[Trait("AC", "164UC1")]
	public async Task CreateManyAsync_NewTokens_PersistsAllViaCompositeArrayParameter()
	{
		var cancellationToken = TestContext.Current.CancellationToken;
		var tokens = new[]
		{
			new RevokedAccessToken(Guid.NewGuid(), new DateTime(2026, 8, 1, 12, 0, 0, DateTimeKind.Utc)),
			new RevokedAccessToken(Guid.NewGuid(), new DateTime(2026, 8, 2, 12, 0, 0, DateTimeKind.Utc)),
		};

		var unitOfWork = _context.ServiceProvider.GetRequiredService<IUnitOfWork>();
		var repository = _context.ServiceProvider.GetRequiredService<RevokedAccessTokenRepository>();

		await unitOfWork.BeginAsync(cancellationToken);
		await repository.CreateManyAsync(tokens, cancellationToken);
		await unitOfWork.CommitAsync(cancellationToken);

		var firstExpiresAt = await _reader.FetchExpiresAtAsync(tokens[0].Jti, cancellationToken);
		var secondExpiresAt = await _reader.FetchExpiresAtAsync(tokens[1].Jti, cancellationToken);

		firstExpiresAt.ShouldBe(tokens[0].ExpiresAt);
		secondExpiresAt.ShouldBe(tokens[1].ExpiresAt);
	}

	[Fact]
	[Trait("AC", "164UC2")]
	public async Task CreateManyAsync_BatchContainsExistingJti_LeavesExistingRowUntouchedAndInsertsRest()
	{
		var cancellationToken = TestContext.Current.CancellationToken;
		var existingJti = Guid.NewGuid();
		var existingExpiresAt = new DateTime(2026, 8, 3, 12, 0, 0, DateTimeKind.Utc);
		var newJti = Guid.NewGuid();
		var newExpiresAt = new DateTime(2026, 8, 4, 12, 0, 0, DateTimeKind.Utc);

		var unitOfWork = _context.ServiceProvider.GetRequiredService<IUnitOfWork>();
		var repository = _context.ServiceProvider.GetRequiredService<RevokedAccessTokenRepository>();

		await unitOfWork.BeginAsync(cancellationToken);
		await repository.CreateManyAsync([new RevokedAccessToken(existingJti, existingExpiresAt)], cancellationToken);
		await unitOfWork.CommitAsync(cancellationToken);

		// A different expires_at for the conflicting jti proves ON CONFLICT DO NOTHING
		// left the original row untouched rather than overwriting it.
		await unitOfWork.BeginAsync(cancellationToken);
		await repository.CreateManyAsync(
			[
				new RevokedAccessToken(existingJti, existingExpiresAt.AddDays(10)),
				new RevokedAccessToken(newJti, newExpiresAt),
			],
			cancellationToken);
		await unitOfWork.CommitAsync(cancellationToken);

		var existingRowExpiresAt = await _reader.FetchExpiresAtAsync(existingJti, cancellationToken);
		var newRowExpiresAt = await _reader.FetchExpiresAtAsync(newJti, cancellationToken);

		existingRowExpiresAt.ShouldBe(existingExpiresAt);
		newRowExpiresAt.ShouldBe(newExpiresAt);
	}
}