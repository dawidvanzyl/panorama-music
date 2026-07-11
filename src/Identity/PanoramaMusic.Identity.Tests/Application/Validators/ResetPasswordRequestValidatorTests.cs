using Moq;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Application.Requests.Auth;
using PanoramaMusic.Identity.Application.Validators.Auth;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Tests.Application.Validators;

public class ResetPasswordRequestValidatorTests
{
	private readonly Mock<ICommonPasswordService> _commonPasswordService = new();
	private readonly ResetPasswordRequestValidator _validator;

	public ResetPasswordRequestValidatorTests()
	{
		_commonPasswordService
			.Setup(s => s.ValidateAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync(true);
		_validator = new ResetPasswordRequestValidator(_commonPasswordService.Object);
	}

	[Fact]
	[Trait("AC", "M1.3UC1")]
	public async Task Validate_EmptyToken_ReturnsFailureNamingToken()
	{
		var result = await _validator.ValidateAsync(new ResetPasswordRequest("", "alllowercaseletters"), TestContext.Current.CancellationToken);

		result.IsValid.ShouldBeFalse();
		result.Errors.ShouldContain(e => e.PropertyName == nameof(ResetPasswordRequest.Token));
	}

	[Fact]
	[Trait("AC", "M1.4UC1")]
	public async Task Validate_PasswordMeetsLengthMinimumWithNoCharacterClassMix_IsAccepted()
	{
		var result = await _validator.ValidateAsync(new ResetPasswordRequest("token", "alllowercaseletters"), TestContext.Current.CancellationToken);

		result.IsValid.ShouldBeTrue();
	}

	[Fact]
	[Trait("AC", "M1.4UC1")]
	public async Task Validate_PasswordBelowLengthMinimum_ReturnsFailureNamingPassword()
	{
		var result = await _validator.ValidateAsync(new ResetPasswordRequest("token", "weak"), TestContext.Current.CancellationToken);

		result.IsValid.ShouldBeFalse();
		result.Errors.ShouldContain(e => e.PropertyName == nameof(ResetPasswordRequest.NewPassword));
	}

	[Fact]
	[Trait("AC", "M1.4UC2")]
	public async Task Validate_PasswordFailsCommonPasswordCheck_ReturnsFailureNamingPassword()
	{
		_commonPasswordService.Setup(s => s.ValidateAsync("password123", It.IsAny<CancellationToken>())).ReturnsAsync(false);

		var result = await _validator.ValidateAsync(new ResetPasswordRequest("token", "password123"), TestContext.Current.CancellationToken);

		result.IsValid.ShouldBeFalse();
		result.Errors.ShouldContain(e => e.PropertyName == nameof(ResetPasswordRequest.NewPassword));
	}

	[Fact]
	[Trait("AC", "M1.4UC3")]
	public async Task Validate_PasswordExceedsMaximumLength_ReturnsFailureNamingPassword()
	{
		var result = await _validator.ValidateAsync(new ResetPasswordRequest("token", new string('a', 129)), TestContext.Current.CancellationToken);

		result.IsValid.ShouldBeFalse();
		result.Errors.ShouldContain(e => e.PropertyName == nameof(ResetPasswordRequest.NewPassword));
	}
}