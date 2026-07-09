using PanoramaMusic.Audit.Application.Requests;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Audit.Tests.Application;

public class AuditToDateResolverTests
{
	[Fact]
	[Trait("AC", "M1.5UC12")]
	public void TryResolveInclusiveUpperBound_GivenNull_ReturnsTrueWithNoBound()
	{
		var resolved = AuditToDateResolver.TryResolveInclusiveUpperBound(null, out var bound);

		resolved.ShouldBeTrue();
		bound.ShouldBeNull();
	}

	[Fact]
	[Trait("AC", "M1.5UC12")]
	public void TryResolveInclusiveUpperBound_GivenBareDate_ResolvesToOneMicrosecondBeforeTheNextUtcDay()
	{
		var resolved = AuditToDateResolver.TryResolveInclusiveUpperBound("2026-07-08", out var bound);

		resolved.ShouldBeTrue();
		bound.ShouldNotBeNull();
		bound!.Value.ShouldBe(new DateTime(2026, 7, 9, 0, 0, 0, DateTimeKind.Utc).AddTicks(-10));
	}

	[Fact]
	[Trait("AC", "M1.5UC12")]
	public void TryResolveInclusiveUpperBound_GivenPreciseTimestamp_ResolvesToThatExactInstantWithNoDayExpansion()
	{
		var resolved = AuditToDateResolver.TryResolveInclusiveUpperBound("2026-07-08T22:00:00.000Z", out var bound);

		resolved.ShouldBeTrue();
		bound.ShouldNotBeNull();
		bound!.Value.ShouldBe(new DateTime(2026, 7, 8, 22, 0, 0, DateTimeKind.Utc));
	}

	[Fact]
	[Trait("AC", "M1.5UC12")]
	public void TryResolveInclusiveUpperBound_GivenPreciseTimestampThatLandsOnMidnight_TreatsItAsAnExactInstantNotAWholeDay()
	{
		// The one genuinely ambiguous case: a precise timestamp that happens to
		// be exactly UTC midnight is indistinguishable in value from a bare
		// date once parsed — but the raw string here clearly has a time
		// component, so the resolver must treat it as an exact instant.
		var resolved = AuditToDateResolver.TryResolveInclusiveUpperBound("2026-07-08T00:00:00.000Z", out var bound);

		resolved.ShouldBeTrue();
		bound.ShouldNotBeNull();
		bound!.Value.ShouldBe(new DateTime(2026, 7, 8, 0, 0, 0, DateTimeKind.Utc));
	}

	[Fact]
	[Trait("AC", "M1.5UC12")]
	public void TryResolveInclusiveUpperBound_GivenMalformedString_ReturnsFalse()
	{
		var resolved = AuditToDateResolver.TryResolveInclusiveUpperBound("not-a-date", out var bound);

		resolved.ShouldBeFalse();
		bound.ShouldBeNull();
	}
}