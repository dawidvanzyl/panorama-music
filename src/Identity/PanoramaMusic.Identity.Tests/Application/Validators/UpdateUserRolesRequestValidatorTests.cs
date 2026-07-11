using PanoramaMusic.Identity.Application.Requests.Admin;
using PanoramaMusic.Identity.Application.Validators.Admin;
using PanoramaMusic.Identity.Domain.Enums;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Tests.Application.Validators;

public class UpdateUserRolesRequestValidatorTests
{
	private readonly UpdateUserRolesRequestValidator _validator = new();

	[Fact]
	[Trait("AC", "M1.3UC1")]
	public void Validate_EmptyRoles_ReturnsFailureNamingRoles()
	{
		var result = _validator.Validate(new UpdateUserRolesRequest([]));

		result.IsValid.ShouldBeFalse();
		result.Errors.ShouldContain(e => e.PropertyName == nameof(UpdateUserRolesRequest.Roles));
	}

	[Fact]
	[Trait("AC", "M1.3UC1")]
	public void Validate_NonEmptyRoles_ReturnsSuccess()
	{
		var result = _validator.Validate(new UpdateUserRolesRequest([Role.Teacher]));

		result.IsValid.ShouldBeTrue();
	}
}