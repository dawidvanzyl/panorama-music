namespace PanoramaMusic.Identity.Domain.Exceptions;

public sealed class PasswordPolicyException(IReadOnlyList<string> failedRules)
	: Exception(string.Join(" ", failedRules))
{
	public IReadOnlyList<string> FailedRules { get; } = failedRules;
}