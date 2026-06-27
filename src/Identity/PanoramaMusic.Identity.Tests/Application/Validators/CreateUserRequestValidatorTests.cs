using PanoramaMusic.Identity.Application.Requests.Admin;
using PanoramaMusic.Identity.Application.Validators.Admin;
using PanoramaMusic.Identity.Domain.Enums;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Tests.Application.Validators;

public class CreateUserRequestValidatorTests
{
	private readonly CreateUserRequestValidator _validator = new();

	[Fact]
	[Trait("AC", "M1.3UC3")]
	public void Validate_InvalidEmail_ReturnsFailureNamingEmail()
	{
		var result = _validator.Validate(new CreateUserRequest("not-an-email", [Role.Teacher]));

		result.IsValid.ShouldBeFalse();
		result.Errors.ShouldContain(e => e.PropertyName == nameof(CreateUserRequest.Email));
	}

	[Fact]
	[Trait("AC", "M1.3UC3")]
	public void Validate_EmptyRoles_ReturnsFailureNamingRoles()
	{
		var result = _validator.Validate(new CreateUserRequest("user@test.com", []));

		result.IsValid.ShouldBeFalse();
		result.Errors.ShouldContain(e => e.PropertyName == nameof(CreateUserRequest.Roles));
	}

	[Fact]
	[Trait("AC", "M1.3UC3")]
	public void Validate_ValidRequest_ReturnsSuccess()
	{
		var result = _validator.Validate(new CreateUserRequest("user@test.com", [Role.Teacher]));

		result.IsValid.ShouldBeTrue();
	}
}