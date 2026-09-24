using PanoramaMusic.Reporting.Domain.ValueObjects;

namespace PanoramaMusic.Reporting.Domain.Formats;

/// <summary>
/// Step Type column: blank unless the course type is Instrument or Theory,
/// otherwise the stored step with its leading <c>Step</c> prefix removed
/// (e.g. <c>Step2A</c> -&gt; <c>2A</c>, <c>Other</c> stays <c>Other</c>).
/// </summary>
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