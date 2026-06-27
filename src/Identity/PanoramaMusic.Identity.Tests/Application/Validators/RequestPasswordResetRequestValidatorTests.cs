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
	[Trait("AC", "M1.3UC3")]
	public void Validate_InvalidEmail_ReturnsFailureNamingEmail(string email)
	{
		var result = _validator.Validate(new RequestPasswordResetRequest(email));

		result.IsValid.ShouldBeFalse();
		result.Errors.ShouldContain(e => e.PropertyName == nameof(RequestPasswordResetRequest.Email));
	}

	[Fact]
	[Trait("AC", "M1.3UC3")]
	public void Validate_ValidEmail_ReturnsSuccess()
	{
		var result = _validator.Validate(new RequestPasswordResetRequest("user@test.com"));

		result.IsValid.ShouldBeTrue();
	}
}