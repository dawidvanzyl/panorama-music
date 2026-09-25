namespace PanoramaMusic.Reporting.Tests.Fixtures;

/// <summary>A fixed-time <see cref="TimeProvider"/> a test can move, so a run's timestamp is asserted exactly.</summary>
public sealed class SettableTimeProvider : TimeProvider
{
	private DateTimeOffset _utcNow = DateTimeOffset.UtcNow;

	public override DateTimeOffset GetUtcNow() => _utcNow;

	public void SetUtcNow(DateTimeOffset utcNow) => _utcNow = utcNow;
}
