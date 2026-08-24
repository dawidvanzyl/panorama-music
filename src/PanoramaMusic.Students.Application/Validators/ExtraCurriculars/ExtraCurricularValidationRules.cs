namespace PanoramaMusic.Students.Application.Validators.ExtraCurriculars;

/// <summary>
/// Bounds on an extra-curricular activity's free-text description. The backing
/// column is unbounded, so this is the only place the length is capped.
/// </summary>
public static class ExtraCurricularValidationRules
{
	public const int DescriptionMaxLength = 100;
}
