using PanoramaMusic.Identity.Application.Requests.Auth;
using PanoramaMusic.Identity.Application.Validators.Auth;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Tests.Application.Validators;

public class CompleteRegistrationRequestValidatorTests
{
	private readonly CompleteRegistrationRequestValidator _validator = new();

	[Fact]
	[Trait("AC", "M1.3UC3")]
	public void Validate_EmptyInviteToken_ReturnsFailureNamingInviteToken()
	{
		var result = _validator.Validate(new CompleteRegistrationRequest("", "ValidPass1"));

		result.IsValid.ShouldBeFalse();
		result.Errors.ShouldContain(e => e.PropertyName == nameof(CompleteRegistrationRequest.InviteToken));
	}

	[Theory]
	[InlineData("short1A")]
	[InlineData("alllowercase1")]
	[InlineData("ALLUPPERCASE1")]
	[InlineData("NoDigitHere")]
	[Trait("AC", "M1.3UC4")]
	public void Validate_WeakPassword_ReturnsFailureForViolatedRule(string password)
	{
		var result = _validator.Validate(new CompleteRegistrationRequest("token", password));

		result.IsValid.ShouldBeFalse();
		result.Errors.ShouldContain(e => e.PropertyName == nameof(CompleteRegistrationRequest.NewPassword));
	}

	[Fact]
	[Trait("AC", "M1.3UC4")]
	public void Validate_PolicyCompliantPassword_DoesNotFailOnPassword()
	{
		var result = _validator.Validate(new CompleteRegistrationRequest("token", "ValidPass1"));

		result.IsValid.ShouldBeTrue();
	}
}