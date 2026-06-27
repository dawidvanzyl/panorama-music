using PanoramaMusic.Identity.Application.Requests.Auth;
using PanoramaMusic.Identity.Application.Validators.Auth;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Tests.Application.Validators;

public class RefreshTokenRequestValidatorTests
{
	private readonly RefreshTokenRequestValidator _validator = new();

	[Fact]
	[Trait("AC", "M1.3UC3")]
	public void Validate_EmptyToken_ReturnsFailureNamingToken()
	{
		var result = _validator.Validate(new RefreshTokenRequest(""));

		result.IsValid.ShouldBeFalse();
		result.Errors.ShouldContain(e => e.PropertyName == nameof(RefreshTokenRequest.Token));
	}

	[Fact]
	[Trait("AC", "M1.3UC3")]
	public void Validate_NonEmptyToken_ReturnsSuccess()
	{
		var result = _validator.Validate(new RefreshTokenRequest("a-token"));

		result.IsValid.ShouldBeTrue();
	}
}