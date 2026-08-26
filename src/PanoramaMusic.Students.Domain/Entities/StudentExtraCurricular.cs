using PanoramaMusic.Domain;
using PanoramaMusic.Students.Domain.Events.StudentExtraCurriculars;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Messages;

namespace PanoramaMusic.Students.Domain.Entities;

/// <summary>
/// A single student's participation in a single extra-curricular activity. The
/// link carries no attributes of its own, so the pair of student and activity is
/// its whole identity — there is no surrogate key, and the activity is how one is
/// addressed.
/// <para>
/// It holds the activity itself rather than just its identifier, for the same
/// reason <see cref="StudentCourse"/> holds its course: the phase rule is about
/// the activity's phase, so an assignment can only be built from an activity that
/// was actually read back.
/// </para>
/// </summary>
public sealed class StudentExtraCurricular : AggregateRoot
{
	public StudentExtraCurricular(Guid studentId, ExtraCurricular extraCurricular)
	{
		StudentId = studentId;
		ExtraCurricular = extraCurricular;
	}

	public Guid StudentId { get; }

	public ExtraCurricular ExtraCurricular { get; }

	/// <summary>
	/// Assigns the student to the activity. A student takes part only in
	/// activities offered to their own phase, and a student whose phase is not
	/// recorded takes part in none — neither is something the request can carry,
	/// so both are answered here rather than by a request validator.
	/// </summary>
	/// <exception cref="DomainException">The activity is not offered to the student's phase.</exception>
	public static StudentExtraCurricular Assign(Student student, ExtraCurricular extraCurricular)
	{
		if (student.Phase != extraCurricular.Phase)
			throw new DomainException(StudentExtraCurricularMessages.PhaseMismatch);

		var assignment = new StudentExtraCurricular(student.StudentId, extraCurricular);

		assignment.Raise(new StudentAssignedToExtraCurricular(student, assignment));
		return assignment;
	}

	/// <summary>
	/// The student no longer takes part. Only the link goes — neither the student
	/// nor the activity is affected.
	/// </summary>
	public void MarkRemoved(Student student)
	{
		Raise(new StudentRemovedFromExtraCurricular(student, this));
	}
}