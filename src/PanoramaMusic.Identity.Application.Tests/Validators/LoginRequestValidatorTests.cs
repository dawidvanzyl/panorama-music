using PanoramaMusic.Identity.Application.Requests.Auth;
using PanoramaMusic.Identity.Application.Validators.Auth;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Application.Tests.Validators;

public class LoginRequestValidatorTests
{
	private readonly LoginRequestValidator _validator = new();

	[Theory]
	[InlineData("", "Password1")]
	[InlineData("not-an-email", "Password1")]
	[InlineData("user@test.com", "")]
	[Trait("AC", "M1.3UC1")]
	public void Validate_InvalidFieldValues_ReturnsFailureNamingInvalidField(string email, string password)
	{
		var result = _validator.Validate(new LoginRequest(email, password));

		result.ShouldSatisfyAllConditions(
			result => result.IsValid.ShouldBeFalse(),
			result => result.Errors.ShouldNotBeEmpty());
	}

	[Fact]
	[Trait("AC", "M1.3UC1")]
	public void Validate_ValidRequest_ReturnsSuccess()
	{
		var result = _validator.Validate(new LoginRequest("user@test.com", "Password1"));

		result.IsValid.ShouldBeTrue();
	}

	[Fact]
	[Trait("AC", "M1.4UC3")]
	public void Validate_EmailExceedsMaximumLength_ReturnsFailureNamingEmail()
	{
		var overlongEmail = $"{new string('a', 250)}@test.com";

		var result = _validator.Validate(new LoginRequest(overlongEmail, "Password1"));

		result.ShouldSatisfyAllConditions(
			result => result.IsValid.ShouldBeFalse(),
			result => result.Errors.ShouldContain(e => e.PropertyName == nameof(LoginRequest.Email)));
	}

	[Fact]
	[Trait("AC", "M1.4UC3")]
	public void Validate_PasswordExceedsMaximumLength_ReturnsFailureNamingPassword()
	{
		var result = _validator.Validate(new LoginRequest("user@test.com", new string('a', 129)));

		result.ShouldSatisfyAllConditions(
			result => result.IsValid.ShouldBeFalse(),
			result => result.Errors.ShouldContain(e => e.PropertyName == nameof(LoginRequest.Password)));
	}
}