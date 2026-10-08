using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.Logging;
using Moq;
using PanoramaMusic.Api.Middleware;
using PanoramaMusic.Api.Tests.Features;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Persistence.Transactions;
using Shouldly;
using Xunit;
using StudentsExceptions = PanoramaMusic.Students.Domain.Exceptions;

namespace PanoramaMusic.Api.Tests;

public sealed class UnitOfWorkMiddlewareTests
{
	private const string _begin = "Begin";
	private const string _flush = "Flush";
	private const string _flushDurable = "FlushDurable";
	private const string _commit = "Commit";
	private const string _rollback = "Rollback";
	private const string _started = ServerResponseFeature.ResponseStartedEntry;

	private readonly List<string> _log = [];
	private readonly Mock<IUnitOfWork> _unitOfWork = new();
	private readonly Mock<IAuditFlushService> _auditFlushService = new();
	private readonly ServerResponseFeature _server;
	private readonly DefaultHttpContext _context;

	public UnitOfWorkMiddlewareTests()
	{
		_server = new ServerResponseFeature(_log);
		_context = new DefaultHttpContext();
		_context.Features.Set<IHttpResponseFeature>(_server);
		_context.Features.Set<IHttpResponseBodyFeature>(_server);
		_context.Items[CorrelationIdMiddleware.ItemKey] = "test-correlation-id";

		_unitOfWork.Setup(u => u.BeginAsync(It.IsAny<CancellationToken>())).Callback(() => _log.Add(_begin)).Returns(Task.CompletedTask);
		_unitOfWork.Setup(u => u.CommitAsync(It.IsAny<CancellationToken>())).Callback(() => _log.Add(_commit)).Returns(Task.CompletedTask);
		_unitOfWork.Setup(u => u.RollbackAsync(It.IsAny<CancellationToken>())).Callback(() => _log.Add(_rollback)).Returns(Task.CompletedTask);
		_auditFlushService.Setup(a => a.FlushAsync(It.IsAny<CancellationToken>())).Callback(() => _log.Add(_flush)).Returns(Task.CompletedTask);
		_auditFlushService.Setup(a => a.FlushDurableAsync(It.IsAny<CancellationToken>())).Callback(() => _log.Add(_flushDurable)).Returns(Task.CompletedTask);
	}

	[Fact]
	[Trait("AC", "355UC1")]
	public async Task InvokeAsync_EndpointWritesBody_CommitsOnceBeforeResponseStarts()
	{
		var middleware = new UnitOfWorkMiddleware(async context =>
		{
			context.Response.StatusCode = StatusCodes.Status201Created;
			await context.Response.WriteAsync("created", context.RequestAborted);
		});

		await middleware.InvokeAsync(_context, _unitOfWork.Object, _auditFlushService.Object);

		_log.ShouldBe([_begin, _flush, _commit, _started]);
	}

	[Fact]
	[Trait("AC", "355UC2")]
	public async Task InvokeAsync_EndpointThrowsBeforeWriting_RollsBackAndNeverCommits()
	{
		var exception = new StudentsExceptions.DomainException("Invalid student.");
		var middleware = new UnitOfWorkMiddleware(_ => throw exception);
		var handler = new ApiExceptionHandler(new LoggerFactory().CreateLogger<ApiExceptionHandler>());

		var thrown = await Should.ThrowAsync<StudentsExceptions.DomainException>(
			() => middleware.InvokeAsync(_context, _unitOfWork.Object, _auditFlushService.Object));
		var handled = await handler.TryHandleAsync(_context, thrown, TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => thrown.ShouldBeSameAs(exception),
			() => handled.ShouldBeTrue(),
			() => _context.Response.StatusCode.ShouldBe(StatusCodes.Status400BadRequest),
			() => _log.ShouldBe([_begin, _flushDurable, _rollback, _started]));
	}

	[Fact]
	[Trait("AC", "355UC3")]
	public async Task InvokeAsync_EndpointWritesNoBody_CommitsOnceAfterEndpointReturns()
	{
		var middleware = new UnitOfWorkMiddleware(context =>
		{
			context.Response.StatusCode = StatusCodes.Status204NoContent;
			return Task.CompletedTask;
		});

		await middleware.InvokeAsync(_context, _unitOfWork.Object, _auditFlushService.Object);
		var logAfterInvoke = _log.ToList();
		await _server.StartAsync(TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => logAfterInvoke.ShouldBe([_begin, _flush, _commit]),
			() => _log.ShouldBe([_begin, _flush, _commit, _started]));
	}

	[Fact]
	[Trait("AC", "355UC4")]
	public async Task InvokeAsync_CommitFailsWhileResponseStarts_ThrowsAndRollsBackAfterCommitAttempt()
	{
		var failure = new InvalidOperationException("commit failed");
		_unitOfWork.Setup(u => u.CommitAsync(It.IsAny<CancellationToken>())).Callback(() => _log.Add(_commit)).ThrowsAsync(failure);
		var middleware = new UnitOfWorkMiddleware(async context =>
		{
			context.Response.StatusCode = StatusCodes.Status201Created;
			await context.Response.WriteAsync("created", context.RequestAborted);
		});

		var thrown = await Should.ThrowAsync<InvalidOperationException>(
			() => middleware.InvokeAsync(_context, _unitOfWork.Object, _auditFlushService.Object));

		ShouldlyHelpers.Satisfy(
			() => thrown.ShouldBeSameAs(failure),
			() => _server.HasStarted.ShouldBeFalse(),
			() => _log.ShouldBe([_begin, _flush, _commit, _flushDurable, _rollback]));
	}

	[Fact]
	[Trait("AC", "355UC4")]
	public async Task InvokeAsync_AuditFlushFailsWhileResponseStarts_ThrowsWithoutCommitAndRollsBack()
	{
		var failure = new InvalidOperationException("flush failed");
		_auditFlushService.Setup(a => a.FlushAsync(It.IsAny<CancellationToken>())).Callback(() => _log.Add(_flush)).ThrowsAsync(failure);
		var middleware = new UnitOfWorkMiddleware(async context =>
		{
			context.Response.StatusCode = StatusCodes.Status201Created;
			await context.Response.WriteAsync("created", context.RequestAborted);
		});

		var thrown = await Should.ThrowAsync<InvalidOperationException>(
			() => middleware.InvokeAsync(_context, _unitOfWork.Object, _auditFlushService.Object));

		ShouldlyHelpers.Satisfy(
			() => thrown.ShouldBeSameAs(failure),
			() => _log.ShouldBe([_begin, _flush, _flushDurable, _rollback]));
	}

	[Fact]
	[Trait("AC", "355UC4")]
	public async Task InvokeAsync_CommitFailsForResponseWithoutBody_ThrowsAndRollsBack()
	{
		var failure = new InvalidOperationException("commit failed");
		_unitOfWork.Setup(u => u.CommitAsync(It.IsAny<CancellationToken>())).Callback(() => _log.Add(_commit)).ThrowsAsync(failure);
		var middleware = new UnitOfWorkMiddleware(context =>
		{
			context.Response.StatusCode = StatusCodes.Status204NoContent;
			return Task.CompletedTask;
		});

		var thrown = await Should.ThrowAsync<InvalidOperationException>(
			() => middleware.InvokeAsync(_context, _unitOfWork.Object, _auditFlushService.Object));

		ShouldlyHelpers.Satisfy(
			() => thrown.ShouldBeSameAs(failure),
			() => _log.ShouldBe([_begin, _flush, _commit, _flushDurable, _rollback]));
	}

	[Fact]
	[Trait("AC", "355UC5")]
	public async Task InvokeAsync_EndpointWritesValidationBodyWithoutThrowing_CommitsBeforeResponseStarts()
	{
		var middleware = new UnitOfWorkMiddleware(async context =>
		{
			context.Response.StatusCode = StatusCodes.Status400BadRequest;
			await context.Response.WriteAsync("invalid", context.RequestAborted);
		});

		await middleware.InvokeAsync(_context, _unitOfWork.Object, _auditFlushService.Object);

		_log.ShouldBe([_begin, _flush, _commit, _started]);
	}

	[Fact]
	[Trait("AC", "355UC6")]
	public async Task InvokeAsync_EndpointThrowsAfterResponseStarted_RethrowsOriginalExceptionWithoutRollback()
	{
		var exception = new IOException("client disconnected");
		var middleware = new UnitOfWorkMiddleware(async context =>
		{
			context.Response.StatusCode = StatusCodes.Status201Created;
			await context.Response.WriteAsync("part", context.RequestAborted);
			throw exception;
		});

		var thrown = await Should.ThrowAsync<IOException>(
			() => middleware.InvokeAsync(_context, _unitOfWork.Object, _auditFlushService.Object));

		ShouldlyHelpers.Satisfy(
			() => thrown.ShouldBeSameAs(exception),
			() => _log.ShouldBe([_begin, _flush, _commit, _started]));
	}
}