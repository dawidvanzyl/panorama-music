using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using System.IO.Pipelines;

namespace PanoramaMusic.Api.Tests.Features;

/// <summary>
/// Models how a real server starts a response: the first start runs the registered
/// <c>OnStarting</c> callbacks (last registered first) and only then marks the response
/// as started. An exception from a callback reaches the caller and leaves the response
/// unstarted.
/// </summary>
public sealed class ServerResponseFeature : IHttpResponseFeature, IHttpResponseBodyFeature
{
	public const string ResponseStartedEntry = "ResponseStarted";

	private readonly List<string> _callLog;
	private readonly Stack<(Func<object, Task> Callback, object State)> _onStarting = new();
	private readonly MemoryStream _body = new();

	public ServerResponseFeature(List<string> callLog)
	{
		_callLog = callLog;
		Writer = PipeWriter.Create(_body, new StreamPipeWriterOptions(leaveOpen: true));
	}

	public int StatusCode { get; set; } = 200;

	public string? ReasonPhrase { get; set; }

	public IHeaderDictionary Headers { get; set; } = new HeaderDictionary();

	public Stream Body
	{
		get => _body;
		set => throw new NotSupportedException();
	}

	public bool HasStarted { get; private set; }

	public Stream Stream => _body;

	public PipeWriter Writer { get; }

	public void OnStarting(Func<object, Task> callback, object state) => _onStarting.Push((callback, state));

	public void OnCompleted(Func<object, Task> callback, object state)
	{
	}

	public async Task StartAsync(CancellationToken cancellationToken = default)
	{
		if (HasStarted)
			return;

		while (_onStarting.Count > 0)
		{
			var (callback, state) = _onStarting.Pop();
			await callback(state);
		}

		HasStarted = true;
		_callLog.Add(ResponseStartedEntry);
	}

	public void DisableBuffering()
	{
	}

	public Task SendFileAsync(string path, long offset, long? count, CancellationToken cancellationToken = default) =>
		throw new NotSupportedException();

	public Task CompleteAsync() => StartAsync();
}