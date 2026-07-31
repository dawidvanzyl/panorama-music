namespace PanoramaMusic.Students.Application.Validators.Guardians;

/// <summary>
/// Input length caps for guardian writes (ASVS 5.0.0-1.3.3 — trim excessively
/// long input). The backing columns are unbounded TEXT, so these bounds are
/// enforced at the validator rather than by the schema.
/// </summary>
public static class GuardianValidationRules
{
	public const int NameMaxLength = 100;

	public const int CellMaxLength = 30;

	/// <summary>RFC 5321 max, matching the Identity context's email cap.</summary>
	public const int EmailMaxLength = 254;
}