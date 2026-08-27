namespace PanoramaMusic.Students.Domain.Messages;

/// <summary>
/// Why an extra-curricular assignment was refused. The same wording is what the
/// endpoint reports and what the Student modal shows, so a refusal reads
/// identically wherever it surfaces.
/// </summary>
public static class StudentExtraCurricularMessages
{
	public const string ActivityRequired = "Choose an activity.";

	/// <summary>
	/// Stated in terms of the grade rather than the absent phase. A Private-grade
	/// student carries no phase, so the phase rule would refuse the assignment
	/// anyway — but it would give the wrong reason for it.
	/// </summary>
	public const string PrivateGradeExcluded =
		"A Private-grade student does not take part in extra-curricular activities.";

	public const string AlreadyAssigned = "The student already takes part in this activity.";

	public const string PhaseMismatch = "A student can only be assigned to an activity offered to their own phase.";
}