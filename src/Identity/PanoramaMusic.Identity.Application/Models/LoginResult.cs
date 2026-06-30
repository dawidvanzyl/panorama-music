namespace PanoramaMusic.Identity.Application.Models;

public sealed record LoginResult(AuthResult? Tokens, string? PasswordResetToken)
{
	public bool RequiresPasswordReset => PasswordResetToken is not null;

	public static LoginResult Success(AuthResult tokens) => new(tokens, null);

	public static LoginResult RotationRequired(string passwordResetToken) => new(null, passwordResetToken);
}