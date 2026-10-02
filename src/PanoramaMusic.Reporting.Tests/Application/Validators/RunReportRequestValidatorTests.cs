using PanoramaMusic.Reporting.Application.Requests;
using PanoramaMusic.Reporting.Application.Validators;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Reporting.Tests.Application.Validators;

/// <summary>
/// Without <c>CascadeMode.Stop</c>, a <c>.NotNull().Must(...)</c> chain still
/// ran <c>Must</c> against the null value, throwing a
/// <see cref="NullReferenceException"/> instead of producing a validation
/// failure — a request omitting a required array (or carrying a null element
/// inside <c>filters</c>) returned 500, not 400.
/// </summary>
public class RunReportRequestValidatorTests
{
	private readonly RunReportRequestValidator _validator = new();

	[Fact]
	[Trait("AC", "317UC21")]
	public void Validate_NullFilters_ReturnsFailureRatherThanThrowing()
	{
		var request = new RunReportRequest(null!, ["student.name"]);

		var result = Should.NotThrow(() => _validator.Validate(request));

		result.IsValid.ShouldBeFalse();
	}

	[Fact]
	[Trait("AC", "317UC21")]
	public void Validate_NullColumns_ReturnsFailureRatherThanThrowing()
	{
		var request = new RunReportRequest([], null!);

		var result = Should.NotThrow(() => _validator.Validate(request));

		result.IsValid.ShouldBeFalse();
	}

	[Fact]
	[Trait("AC", "317UC21")]
	public void Validate_NullFilterElement_ReturnsFailureRatherThanThrowing()
	{
		var request = new RunReportRequest([null!], ["student.name"]);

		var result = Should.NotThrow(() => _validator.Validate(request));

		result.IsValid.ShouldBeFalse();
	}

	[Fact]
	[Trait("AC", "317UC21")]
	public void Validate_NullValuesOnAFilter_ReturnsFailureRatherThanThrowing()
	{
		var request = new RunReportRequest([new ReportFilterRequest("student.name", "contains", null!)], ["student.name"]);

		var result = Should.NotThrow(() => _validator.Validate(request));

		result.IsValid.ShouldBeFalse();
	}

	[Fact]
	[Trait("AC", "317UC21")]
	public void Validate_WellFormedRequest_IsValid()
	{
		var request = new RunReportRequest(
			[new ReportFilterRequest("student.name", "contains", ["zyl"])],
			["student.name"]);

		var result = _validator.Validate(request);

		result.IsValid.ShouldBeTrue();
	}

	[Fact]
	public void Validate_OneHundredValuesOnAFilter_IsValid()
	{
		var values = Enumerable.Range(0, 100).Select(i => $"v{i}").ToList();
		var request = new RunReportRequest([new ReportFilterRequest("student.grade", "in", values)], ["student.name"]);

		var result = _validator.Validate(request);

		result.IsValid.ShouldBeTrue();
	}

	[Fact]
	public void Validate_OneHundredAndOneValuesOnAFilter_IsInvalid()
	{
		var values = Enumerable.Range(0, 101).Select(i => $"v{i}").ToList();
		var request = new RunReportRequest([new ReportFilterRequest("student.grade", "in", values)], ["student.name"]);

		var result = _validator.Validate(request);

		result.IsValid.ShouldBeFalse();
	}
}