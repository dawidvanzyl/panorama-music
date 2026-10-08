using Microsoft.AspNetCore.Http;
using PanoramaMusic.Persistence.Transactions;
using System.Data;

namespace PanoramaMusic.Api.Tests.Transactions;

/// <summary>
/// Forwards everything to the real unit of work, but fails the commit for a request that
/// carries <see cref="HeaderName"/>.
/// </summary>
public sealed class CommitFailingUnitOfWork(IUnitOfWork inner, IHttpContextAccessor httpContextAccessor) : IUnitOfWork
{
	public const string HeaderName = "X-Test-Fail-Commit";

	public IDbConnection Connection => inner.Connection;

	public IDbTransaction Transaction => inner.Transaction;

	public Task BeginAsync(CancellationToken cancellationToken) => inner.BeginAsync(cancellationToken);

	public Task CommitAsync(CancellationToken cancellationToken)
	{
		return httpContextAccessor.HttpContext?.Request.Headers.ContainsKey(HeaderName) == true
			? throw new InvalidOperationException("The commit was failed on purpose.")
			: inner.CommitAsync(cancellationToken);
	}

	public Task RollbackAsync(CancellationToken cancellationToken) => inner.RollbackAsync(cancellationToken);

	public Task ExecuteIsolatedAsync(Func<Task> work, CancellationToken cancellationToken) =>
		inner.ExecuteIsolatedAsync(work, cancellationToken);
}