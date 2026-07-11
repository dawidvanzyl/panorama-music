using Microsoft.Extensions.Logging;
using System.Collections.Concurrent;

namespace PanoramaMusic.Api.Tests.Logging;

public sealed record CapturedLogEntry(
	string Category,
	LogLevel Level,
	string Message,
	Exception? Exception,
	IReadOnlyDictionary<string, object?> Properties);

/// <summary>
/// Captures log entries with their structured state and active scope values so tests
/// can assert that properties such as CorrelationId are attached to entries.
/// </summary>
public sealed class CaptureLoggerProvider : ILoggerProvider, ISupportExternalScope
{
	private IExternalScopeProvider _scopeProvider = new LoggerExternalScopeProvider();

	public ConcurrentQueue<CapturedLogEntry> Entries { get; } = new();

	public ILogger CreateLogger(string categoryName) => new CaptureLogger(this, categoryName);

	public void SetScopeProvider(IExternalScopeProvider scopeProvider) => _scopeProvider = scopeProvider;

	public void Dispose()
	{
	}

	private sealed class CaptureLogger(CaptureLoggerProvider provider, string categoryName) : ILogger
	{
		public IDisposable? BeginScope<TState>(TState state) where TState : notnull =>
			provider._scopeProvider.Push(state);

		public bool IsEnabled(LogLevel logLevel) => true;

		public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
		{
			var properties = new Dictionary<string, object?>();

			provider._scopeProvider.ForEachScope(
				(scope, accumulator) => CollectProperties(scope, accumulator),
				properties);
			CollectProperties(state, properties);

			provider.Entries.Enqueue(new CapturedLogEntry(
				categoryName,
				logLevel,
				formatter(state, exception),
				exception,
				properties));
		}

		private static void CollectProperties(object? source, Dictionary<string, object?> accumulator)
		{
			if (source is not IEnumerable<KeyValuePair<string, object?>> pairs)
			{
				return;
			}

			foreach (var pair in pairs)
			{
				accumulator[pair.Key] = pair.Value;
			}
		}
	}
}