using PanoramaMusic.Reporting.Domain.ValueObjects;
using System.Globalization;

namespace PanoramaMusic.Reporting.Domain.Formats;

/// <summary>
/// Practice Times column: zips the day and start-time arrays, sorts Monday-first
/// then by time, and renders <c>{Day} {HH:mm}</c> joined with <c>&#160;·&#160;</c>, invariant culture.
/// </summary>
public sealed class PracticeTimesFormat(string daysSource, string startTimesSource) : IColumnFormat
{
	public string Format(SourceValues sources)
	{
		var days = sources.GetStrings(daysSource);
		var times = sources.GetTimes(startTimesSource);

		var slots = days.Zip(times, (day, time) => (Day: day, Time: time))
			.OrderBy(slot => MondayFirstRank(slot.Day))
			.ThenBy(slot => slot.Time)
			.Select(slot => $"{slot.Day} {slot.Time.ToString("HH:mm", CultureInfo.InvariantCulture)}");

		return string.Join(" · ", slots);
	}

	private static int MondayFirstRank(string day) =>
		((int)Enum.Parse<DayOfWeek>(day) + 6) % 7;
}
