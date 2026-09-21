using FluentValidation;
using PanoramaMusic.Reporting.Application.Requests;

namespace PanoramaMusic.Reporting.Application.Validators;

/// <summary>
/// Shape validation only (ASVS 1.3.3 / 15.2.2) — whether a field, operator or
/// value is actually registered is a Domain rule, enforced by
/// <c>ReportDefinition.Create</c>. These caps exist so a request cannot make
/// the server do unbounded work, or make the 400 body it can trigger echo
/// back more than a bounded amount of client text.
/// </summary>
public sealed class RunReportRequestValidator : AbstractValidator<RunReportRequest>
{
	private const int _maxFilters = 50;
	private const int _maxValuesPerFilter = 20;
	private const int _maxValueLength = 200;
	private const int _maxColumns = 20;
	private const int _maxKeyLength = 100;

	public RunReportRequestValidator()
	{
		RuleFor(x => x.Filters)
			.NotNull()
			.Must(filters => filters.Count <= _maxFilters)
			.WithMessage($"At most {_maxFilters} filters may be supplied.");

		RuleFor(x => x.Columns)
			.NotNull()
			.Must(columns => columns.Count <= _maxColumns)
			.WithMessage($"At most {_maxColumns} columns may be supplied.");

		RuleForEach(x => x.Columns)
			.NotEmpty()
			.MaximumLength(_maxKeyLength);

		RuleForEach(x => x.Filters).ChildRules(filter =>
		{
			filter.RuleFor(f => f.Field)
				.NotEmpty()
				.MaximumLength(_maxKeyLength);

			filter.RuleFor(f => f.Operator)
				.NotEmpty()
				.MaximumLength(_maxKeyLength);

			filter.RuleFor(f => f.Values)
				.NotNull()
				.Must(values => values.Count <= _maxValuesPerFilter)
				.WithMessage($"At most {_maxValuesPerFilter} values may be supplied per filter.");

			filter.RuleForEach(f => f.Values)
				.MaximumLength(_maxValueLength);
		});
	}
}
