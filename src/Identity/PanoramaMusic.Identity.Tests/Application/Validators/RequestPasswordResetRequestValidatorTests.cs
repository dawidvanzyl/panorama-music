using PanoramaMusic.Identity.Application.Requests.Auth;
using PanoramaMusic.Identity.Application.Validators.Auth;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Tests.Application.Validators;

public class RequestPasswordResetRequestValidatorTests
{
	private readonly RequestPasswordResetRequestValidator _validator = new();

	[Theory]
	[InlineData("")]
	[InlineData("not-an-email")]
	[Trait("AC", "M1.3UC1")]
	public void Validate_InvalidEmail_ReturnsFailureNamingEmail(string email)
	{
		var result = _validator.Validate(new RequestPasswordResetRequest(email));

		result.IsValid.ShouldBeFalse();
		result.Errors.ShouldContain(e => e.PropertyName == nameof(RequestPasswordResetRequest.Email));
	}

	[Fact]
	[Trait("AC", "M1.3UC1")]
	public void Validate_ValidEmail_ReturnsSuccess()
	{
		var result = _validator.Validate(new RequestPasswordResetRequest("user@test.com"));

		result.IsValid.ShouldBeTrue();
	}

	[Fact]
	[Trait("AC", "M1.4UC3")]
	public void Validate_EmailExceedsMaximumLength_ReturnsFailureNamingEmail()
	{
		var overlongEmail = $"{new string('a', 250)}@test.com";

		var result = _validator.Validate(new RequestPasswordResetRequest(overlongEmail));

		result.IsValid.ShouldBeFalse();
		result.Errors.ShouldContain(e => e.PropertyName == nameof(RequestPasswordResetRequest.Email));
	}
}