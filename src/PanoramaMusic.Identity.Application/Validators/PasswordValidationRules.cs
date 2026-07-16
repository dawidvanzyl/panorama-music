using FluentValidation;
using PanoramaMusic.Identity.Application.Interfaces;

namespace PanoramaMusic.Identity.Application.Validators;

public static class PasswordValidationRules
{
	/// <summary>Caps input length ahead of Argon2 hashing (ASVS 5.0.0-2.4.1 / 1.3.3).</summary>
	public const int MaxLength = 128;

	/// <summary>
	/// Enforces the length minimum and common/breached-password check only — no character-composition
	/// rules, per ASVS 5.0.0-6.2.5. Does not apply the length cap; callers must add that separately so it
	/// also covers flows that don't use this policy (e.g. login).
	/// </summary>
	public static IRuleBuilderOptions<T, string> PasswordPolicy<T>(
		this IRuleBuilder<T, string> ruleBuilder,
		ICommonPasswordService commonPasswordService)
	{
		return ruleBuilder
			.MinimumLength(8)
				.WithMessage("Password must be at least 8 characters.")
			.MustAsync((password, cancellationToken) => commonPasswordService.ValidateAsync(password, cancellationToken))
				.WithMessage("This password is too common. Please choose a different password.");
	}
}