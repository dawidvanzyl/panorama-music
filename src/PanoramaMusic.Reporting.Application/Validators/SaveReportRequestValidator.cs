using FluentValidation;
using PanoramaMusic.Reporting.Application.Requests;

namespace PanoramaMusic.Reporting.Application.Validators;

/// <summary>
/// Shape validation only — the name-length and definition-content rules are
/// enforced by <c>SavedReport.Create</c> and <c>ReportDefinition.Create</c>.
/// </summary>
public sealed class SaveReportRequestValidator : AbstractValidator<SaveReportRequest>
{
	public SaveReportRequestValidator()
	{
		RuleFor(x => x.Name).NotNull();

		RuleFor(x => x.Definition)
			.NotNull()
			.SetValidator(new RunReportRequestValidator());
	}
}
