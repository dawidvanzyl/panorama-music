using FluentValidation;

namespace PanoramaMusic.Identity.Application.Validators;

public static class PasswordValidationRules
{
	public static IRuleBuilderOptions<T, string> PasswordPolicy<T>(this IRuleBuilder<T, string> ruleBuilder)
	{
		return ruleBuilder
			.MinimumLength(8)
				.WithMessage("Password must be at least 8 characters.")
			.Must(password => password.Any(char.IsUpper) && password.Any(char.IsLower))
				.WithMessage("Password must contain mixed case (uppercase and lowercase).")
			.Must(password => password.Any(char.IsDigit))
				.WithMessage("Password must contain at least one digit (0-9).");
	}
}