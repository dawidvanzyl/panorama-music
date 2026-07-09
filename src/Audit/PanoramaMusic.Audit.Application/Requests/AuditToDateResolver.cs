using System.Globalization;

namespace PanoramaMusic.Audit.Application.Requests;

// Resolves the "to" filter's inclusive upper bound from its raw string form,
// distinguishing a bare date (e.g. "2026-07-08", from a direct API caller
// following the documented ISO-date contract) from a precise timestamp (e.g.
// the UI converting its own local end-of-day to a UTC instant). This must
// operate on the original string: once a value is parsed into a DateTime, a
// bare date and a timestamp that happens to land exactly on midnight become
// indistinguishable.
public static class AuditToDateResolver
{
	public static bool TryResolveInclusiveUpperBound(string? to, out DateTime? inclusiveUpperBound)
	{
		if (to is null)
		{
			inclusiveUpperBound = null;
			return true;
		}

		if (DateOnly.TryParseExact(to, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
		{
			var startOfDayUtc = DateTime.SpecifyKind(date.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
			inclusiveUpperBound = startOfDayUtc.AddDays(1).AddTicks(-10); // 10 ticks = 1 microsecond, matching Postgres timestamptz precision.
			return true;
		}

		if (DateTime.TryParse(to, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal, out var parsed))
		{
			inclusiveUpperBound = parsed;
			return true;
		}

		inclusiveUpperBound = null;
		return false;
	}
}