using Moq;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Application.Requests.Auth;
using PanoramaMusic.Identity.Application.Validators.Auth;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Tests.Application.Validators;

public class CompleteRegistrationRequestValidatorTests
{
	private readonly Mock<ICommonPasswordService> _commonPasswordService = new();
	private readonly CompleteRegistrationRequestValidator _validator;

	public CompleteRegistrationRequestValidatorTests()
	{
		_commonPasswordService
			.Setup(s => s.ValidateAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync(true);
		_validator = new CompleteRegistrationRequestValidator(_commonPasswordService.Object);
	}

	[Fact]
	[Trait("AC", "M1.3UC1")]
	public async Task Validate_EmptyInviteToken_ReturnsFailureNamingInviteToken()
	{
		var result = await _validator.ValidateAsync(new CompleteRegistrationRequest("", "alllowercaseletters"), TestContext.Current.CancellationToken);

		result.IsValid.ShouldBeFalse();
		result.Errors.ShouldContain(e => e.PropertyName == nameof(CompleteRegistrationRequest.InviteToken));
	}

	[Fact]
	[Trait("AC", "M1.4UC1")]
	public async Task Validate_PasswordMeetsLengthMinimumWithNoCharacterClassMix_IsAccepted()
	{
		var result = await _validator.ValidateAsync(new CompleteRegistrationRequest("token", "alllowercaseletters"), TestContext.Current.CancellationToken);

		result.IsValid.ShouldBeTrue();
	}

	[Fact]
	[Trait("AC", "M1.4UC1")]
	public async Task Validate_PasswordBelowLengthMinimum_ReturnsFailureNamingPassword()
	{
		var result = await _validator.ValidateAsync(new CompleteRegistrationRequest("token", "short1A"), TestContext.Current.CancellationToken);

		result.IsValid.ShouldBeFalse();
		result.Errors.ShouldContain(e => e.PropertyName == nameof(CompleteRegistrationRequest.NewPassword));
	}

	[Fact]
	[Trait("AC", "M1.4UC2")]
	public async Task Validate_PasswordFailsCommonPasswordCheck_ReturnsFailureNamingPassword()
	{
		_commonPasswordService.Setup(s => s.ValidateAsync("password123", It.IsAny<CancellationToken>())).ReturnsAsync(false);

		var result = await _validator.ValidateAsync(new CompleteRegistrationRequest("token", "password123"), TestContext.Current.CancellationToken);

		result.IsValid.ShouldBeFalse();
		result.Errors.ShouldContain(e => e.PropertyName == nameof(CompleteRegistrationRequest.NewPassword));
	}

	[Fact]
	[Trait("AC", "M1.4UC3")]
	public async Task Validate_PasswordExceedsMaximumLength_ReturnsFailureNamingPassword()
	{
		var result = await _validator.ValidateAsync(new CompleteRegistrationRequest("token", new string('a', 129)), TestContext.Current.CancellationToken);

		result.IsValid.ShouldBeFalse();
		result.Errors.ShouldContain(e => e.PropertyName == nameof(CompleteRegistrationRequest.NewPassword));
	}
}