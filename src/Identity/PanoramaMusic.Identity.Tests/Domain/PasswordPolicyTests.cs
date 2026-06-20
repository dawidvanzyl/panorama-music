using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Validators;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Tests.Domain;

public class PasswordPolicyTests
{
	[Theory]
	[InlineData("")]
	[InlineData("abc")]
	[InlineData("short1A")]
	[Trait("AC", "M1.1UC1")]
	public void Validate_PasswordTooShort_ThrowsPasswordPolicyException(string password)
	{
		var ex = Should.Throw<PasswordPolicyException>(() => PasswordPolicy.Validate(password));

		ex.FailedRules.ShouldContain(r => r.Contains("8 characters"));
	}

	[Theory]
	[InlineData("alllowercase1")]
	[InlineData("ALLUPPERCASE1")]
	[Trait("AC", "M1.1UC1")]
	public void Validate_NoMixedCase_ThrowsPasswordPolicyException(string password)
	{
		var ex = Should.Throw<PasswordPolicyException>(() => PasswordPolicy.Validate(password));

		ex.FailedRules.ShouldContain(r => r.Contains("mixed case"));
	}

	[Fact]
	[Trait("AC", "M1.1UC1")]
	public void Validate_NoDigit_ThrowsPasswordPolicyException()
	{
		var ex = Should.Throw<PasswordPolicyException>(() => PasswordPolicy.Validate("NoDigitHere"));

		ex.FailedRules.ShouldContain(r => r.Contains("digit"));
	}

	[Fact]
	[Trait("AC", "M1.1UC1")]
	public void Validate_MultipleRulesFail_ReportsAllFailedRules()
	{
		var ex = Should.Throw<PasswordPolicyException>(() => PasswordPolicy.Validate("weak"));

		ex.FailedRules.Count.ShouldBeGreaterThan(1);
	}

	[Theory]
	[InlineData("ValidPass1")]
	[InlineData("Secure123!")]
	[InlineData("MyP@ssw0rd")]
	[Trait("AC", "M1.1UC2")]
	public void Validate_PolicyCompliantPassword_DoesNotThrow(string password)
	{
		Should.NotThrow(() => PasswordPolicy.Validate(password));
	}
}