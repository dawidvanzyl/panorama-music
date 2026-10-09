using PanoramaMusic.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Messages;

namespace PanoramaMusic.Students.Domain.ValueObjects;

/// <summary>
/// What a student currently holds: how many course enrollments and how many
/// extra-curricular assignments. A student must always hold at least one of
/// either, so this answers whether giving one up would leave them with nothing.
/// </summary>
public sealed record StudentHoldings(int Enrollments, int Assignments)
{
	public void EnsureEnrollmentCanBeWithdrawn()
	{
		if (Enrollments <= 1 && Assignments == 0)
			throw new DomainException(StudentHoldingsMessages.CourseOrExtraCurricularRequired);
	}

	public void EnsureAssignmentCanBeRemoved()
	{
		if (Assignments <= 1 && Enrollments == 0)
			throw new DomainException(StudentHoldingsMessages.CourseOrExtraCurricularRequired);
	}
}