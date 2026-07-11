namespace PanoramaMusic.Identity.Application.Validators;

public static class EmailValidationRules
{
	/// <summary>Caps input length ahead of any auth processing (ASVS 5.0.0-2.4.1 / 1.3.3). RFC 5321 max.</summary>
	public const int MaxLength = 254;
}