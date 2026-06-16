using PanoramaMusic.Identity.Domain.Exceptions;

namespace PanoramaMusic.Identity.Domain.Validators;

public sealed class PasswordPolicy
{
	private PasswordPolicy() { }

	public static void Validate(string? password)
	{
		password ??= string.Empty;
		var failed = new List<string>();

		if (password.Length < 8)
			failed.Add("Password must be at least 8 characters.");

		if (!password.Any(char.IsUpper) || !password.Any(char.IsLower))
			failed.Add("Password must contain mixed case (uppercase and lowercase).");

		if (!password.Any(char.IsDigit))
			failed.Add("Password must contain at least one digit (0-9).");

		if (failed.Count > 0)
			throw new PasswordPolicyException(failed.AsReadOnly());
	}
}