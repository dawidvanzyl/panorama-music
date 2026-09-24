using PanoramaMusic.Reporting.Domain.ValueObjects;

namespace PanoramaMusic.Reporting.Domain.Formats;

/// <summary>Instrument Type column: blank unless the course type is Instrument.</summary>
public sealed class InstrumentTypeFormat(string courseTypeSource, string instrumentTypeSource) : IColumnFormat
{
	public string Format(SourceValues sources)
	{
		if (sources.GetString(courseTypeSource) != "Instrument")
			return string.Empty;

		return sources.GetString(instrumentTypeSource) ?? string.Empty;
	}
}
