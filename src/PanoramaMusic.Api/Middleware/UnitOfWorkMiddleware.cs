using PanoramaMusic.Api.Exceptions;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Persistence.Transactions;

namespace PanoramaMusic.Api.Middleware;

/// <summary>
/// Sole owner of the per-request transaction lifecycle: begins the shared
/// <see cref="IUnitOfWork"/> transaction before the endpoint executes, commits
/// before the response starts, and rolls back when an exception propagates.
/// Handlers and repositories participate in the ambient transaction but never
/// begin, commit, or roll back themselves. An endpoint must do all its database
/// work before its response starts: work after the commit falls to the unit of
/// work's lazy fallback, which never commits.
/// </summary>
public sealed class UnitOfWorkMiddleware(RequestDelegate next)
{
	private enum Outcome
	{
		Pending,
		Committing,
		Committed,
		RolledBack,
	}

	public async Task InvokeAsync(HttpContext context, IUnitOfWork unitOfWork, IAuditFlushService auditFlushService)
	{
		await unitOfWork.BeginAsync(context.RequestAborted);

		var outcome = Outcome.Pending;

		async Task CommitOnceAsync()
		{
			// The exception handler's error write fires this callback too, so a
			// rolled-back request must not commit.
			if (outcome != Outcome.Pending)
				return;

			outcome = Outcome.Committing;
			await auditFlushService.FlushAsync(context.RequestAborted);
			await unitOfWork.CommitAsync(context.RequestAborted);
			outcome = Outcome.Committed;
		}

		context.Response.OnStarting(CommitOnceAsync);

		try
		{
			await next(context);
			await CommitOnceAsync();
		}
		catch (Exception ex)
		{
			if (outcome == Outcome.Committed)
				throw;

			outcome = Outcome.RolledBack;

			try
			{
				await auditFlushService.FlushDurableAsync(CancellationToken.None);
			}
			catch (AggregateException aex)
			{
				throw new FlushDurableException(aex.Message, ex);
			}
			finally
			{
				await unitOfWork.RollbackAsync(CancellationToken.None);
			}

			throw;
		}
	}
}