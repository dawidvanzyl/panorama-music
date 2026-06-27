using PanoramaMusic.Identity.Application.Requests.Auth;
using PanoramaMusic.Identity.Application.Validators.Auth;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Tests.Application.Validators;

public class ResetPasswordRequestValidatorTests
{
	private readonly ResetPasswordRequestValidator _validator = new();

	[Fact]
	[Trait("AC", "M1.3UC1")]
	public void Validate_EmptyToken_ReturnsFailureNamingToken()
	{
		var result = _validator.Validate(new ResetPasswordRequest("", "ValidPass1"));

		result.IsValid.ShouldBeFalse();
		result.Errors.ShouldContain(e => e.PropertyName == nameof(ResetPasswordRequest.Token));
	}

	[Theory]
	[InlineData("weak")]
	[InlineData("nodigithere")]
	[Trait("AC", "M1.3UC2")]
	public void Validate_WeakPassword_ReturnsFailureForViolatedRule(string password)
	{
		var result = _validator.Validate(new ResetPasswordRequest("token", password));

		result.IsValid.ShouldBeFalse();
		result.Errors.ShouldContain(e => e.PropertyName == nameof(ResetPasswordRequest.NewPassword));
	}

	[Fact]
	[Trait("AC", "M1.3UC2")]
	public void Validate_PolicyCompliantPassword_DoesNotFailOnPassword()
	{
		var result = _validator.Validate(new ResetPasswordRequest("token", "ValidPass1"));

		result.IsValid.ShouldBeTrue();
	}
}