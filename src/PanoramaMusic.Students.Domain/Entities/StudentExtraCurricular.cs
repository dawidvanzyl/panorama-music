using PanoramaMusic.Domain;
using PanoramaMusic.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Events.StudentExtraCurriculars;
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
	/// Assigns the student to the activity. A Private-grade student takes part in
	/// activities of any phase; every other student takes part only in activities
	/// offered to their own phase. The request cannot carry the student's phase, so
	/// the rule is answered here rather than by a request validator.
	/// </summary>
	/// <exception cref="DomainException">The student is graded and the activity is not offered to their phase.</exception>
	public static StudentExtraCurricular Assign(Student student, ExtraCurricular extraCurricular)
	{
		if (student.Grade != GradeType.Private && student.Phase != extraCurricular.Phase)
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