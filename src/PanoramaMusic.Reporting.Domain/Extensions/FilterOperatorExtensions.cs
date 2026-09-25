using PanoramaMusic.Reporting.Domain.Enums;

namespace PanoramaMusic.Reporting.Domain.Extensions;

public static class FilterOperatorExtensions
{
	public static string ToOperatorName(this FilterOperator op) => op switch
	{
		FilterOperator.Equals => "equals",
		FilterOperator.Contains => "contains",
		FilterOperator.In => "in",
		_ => throw new ArgumentOutOfRangeException(nameof(op), op, null),
	};
}
