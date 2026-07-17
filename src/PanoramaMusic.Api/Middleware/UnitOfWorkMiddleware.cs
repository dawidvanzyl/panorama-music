using PanoramaMusic.Api.Exceptions;
using PanoramaMusic.Audit.Application.Interfaces;
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
	public async Task InvokeAsync(HttpContext context, IUnitOfWork unitOfWork, IAuditFlushService auditFlushService)
	{
		await unitOfWork.BeginAsync(context.RequestAborted);

		try
		{
			await next(context);
			await auditFlushService.FlushAsync(context.RequestAborted);
			await unitOfWork.CommitAsync(context.RequestAborted);
		}
		catch (Exception ex)
		{
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