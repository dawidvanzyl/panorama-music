using PanoramaMusic.Identity.Application.Requests.Auth;
using PanoramaMusic.Identity.Application.Validators.Auth;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Tests.Application.Validators;

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

		result.IsValid.ShouldBeFalse();
		result.Errors.ShouldNotBeEmpty();
	}

	[Fact]
	[Trait("AC", "M1.3UC1")]
	public void Validate_ValidRequest_ReturnsSuccess()
	{
		var result = _validator.Validate(new LoginRequest("user@test.com", "Password1"));

		result.IsValid.ShouldBeTrue();
	}
}