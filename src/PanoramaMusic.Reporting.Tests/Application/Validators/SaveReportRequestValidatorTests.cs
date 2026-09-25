using PanoramaMusic.Reporting.Application.Requests;
using PanoramaMusic.Reporting.Application.Validators;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Reporting.Tests.Application.Validators;

public class SaveReportRequestValidatorTests
{
	private readonly SaveReportRequestValidator _validator = new();

	[Fact]
	public void Validate_NullDefinition_ReturnsFailureRatherThanThrowing()
	{
		var request = new SaveReportRequest("Grade 4 Contacts", null!);

		var result = Should.NotThrow(() => _validator.Validate(request));

		result.IsValid.ShouldBeFalse();
	}

	[Fact]
	public void Validate_NullName_ReturnsFailure()
	{
		var request = new SaveReportRequest(null!, new RunReportRequest([], ["student.name"]));

		var result = _validator.Validate(request);

		result.IsValid.ShouldBeFalse();
	}
}
