namespace PanoramaMusic.Students.Application.Validators.GuardianRelationships;

/// <summary>
/// Input length cap for relationship-type writes (ASVS 5.0.0-1.3.3 — trim
/// excessively long input). The backing column is unbounded TEXT, so the bound
/// is enforced at the validator rather than by the schema.
/// </summary>
public static class GuardianRelationshipValidationRules
{
	public const int NameMaxLength = 50;
}