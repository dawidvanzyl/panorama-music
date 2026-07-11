using PanoramaMusic.Persistence.Transactions;

namespace PanoramaMusic.Api.Middleware;

/// <summary>
/// Sole owner of the per-request transaction lifecycle: begins the shared
/// <see cref="IUnitOfWork"/> transaction before the endpoint executes, commits
/// after a successful response, and rolls back when an exception propagates.
/// Handlers and repositories participate in the ambient transaction but never
/// begin, commit, or roll back themselves.
/// </summary>
public sealed class UnitOfWorkMiddleware(RequestDelegate next)
{
	public async Task InvokeAsync(HttpContext context, IUnitOfWork unitOfWork)
	{
		await unitOfWork.BeginAsync(context.RequestAborted);

		try
		{
			await next(context);
			await unitOfWork.CommitAsync(context.RequestAborted);
		}
		catch
		{
			// CancellationToken.None: an aborted request must not prevent the
			// rollback from completing.
			await unitOfWork.RollbackAsync(CancellationToken.None);
			throw;
		}
	}
}