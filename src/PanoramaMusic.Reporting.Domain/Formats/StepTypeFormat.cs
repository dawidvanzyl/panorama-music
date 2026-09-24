using PanoramaMusic.Reporting.Domain.ValueObjects;

namespace PanoramaMusic.Reporting.Domain.Formats;

public sealed class StepTypeFormat(string courseTypeSource, string stepTypeSource) : IColumnFormat
{
	public string Format(SourceValues sources)
	{
		var courseType = sources.GetString(courseTypeSource);
		if (courseType is not ("Instrument" or "Theory"))
			return string.Empty;

		var step = sources.GetString(stepTypeSource);
		return step is null ? string.Empty : step.StartsWith("Step", StringComparison.Ordinal) ? step["Step".Length..] : step;
	}
}