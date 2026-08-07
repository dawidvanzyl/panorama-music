namespace PanoramaMusic.Identity.Domain.ValueObjects;

public class ValidationResult
{
	private ValidationResult(bool isValid, string errorMessage)
	{
		IsValid = isValid;
		ErrorMessage = errorMessage;
	}

	private ValidationResult(bool isValid)
		: this(isValid, string.Empty)
	{ }

	public bool IsValid { get; }
	public string ErrorMessage { get; }

	public static ValidationResult Success() => new ValidationResult(true);
	public static ValidationResult Failure(string errorMessage) => new ValidationResult(false, errorMessage);
}