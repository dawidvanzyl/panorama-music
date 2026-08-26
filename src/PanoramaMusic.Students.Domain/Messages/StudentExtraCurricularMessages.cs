namespace PanoramaMusic.Students.Domain.Messages;

/// <summary>
/// Why an extra-curricular assignment was refused. The same wording is what the
/// endpoint reports and what the Student modal shows, so a refusal reads
/// identically wherever it surfaces.
/// </summary>
public static class StudentExtraCurricularMessages
{
	public const string AlreadyAssigned = "The student already takes part in this activity.";

	public const string PhaseMismatch = "A student can only be assigned to an activity offered to their own phase.";
}