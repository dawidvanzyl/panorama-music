using PanoramaMusic.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Messages;

namespace PanoramaMusic.Students.Domain.ValueObjects;

/// <summary>
/// The extra-curriculars a student currently holds. A graded student may only
/// hold activities of their own phase, so this answers whether moving them to a
/// phase would leave them holding an activity that phase does not offer.
/// </summary>
public sealed record HeldExtraCurriculars(IReadOnlyCollection<StudentExtraCurricular> Assignments)
{
	public void EnsureAgreesWith(PhaseType phase)
	{
		if (Assignments.Any(assignment => assignment.ExtraCurricular.Phase != phase))
			throw new DomainException(HeldExtraCurricularsMessages.PhaseMustMatch);
	}
}