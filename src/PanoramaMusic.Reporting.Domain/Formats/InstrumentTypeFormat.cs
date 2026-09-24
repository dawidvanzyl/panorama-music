using PanoramaMusic.Reporting.Domain.ValueObjects;

namespace PanoramaMusic.Reporting.Domain.Formats;

/// <summary>Instrument Type column: blank unless the course type is Instrument.</summary>
public sealed class InstrumentTypeFormat(string courseTypeSource, string instrumentTypeSource) : IColumnFormat
{
	public string Format(SourceValues sources)
	{
		return sources.GetString(courseTypeSource) != "Instrument" ? string.Empty : sources.GetString(instrumentTypeSource) ?? string.Empty;
	}
}