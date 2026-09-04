using PanoramaMusic.Domain;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Events.Guardians;

namespace PanoramaMusic.Students.Domain.Entities;

/// <summary>
/// Pure (studentId, guardianId) link between a student and a guardian. A
/// guardian is shared across a sibling group through one of these per linked
/// student — the relationship type lives on <see cref="Guardian"/>, not here.
/// </summary>
public sealed class StudentGuardian : AggregateRoot
{
	public StudentGuardian(Guid studentId, Guid guardianId)
	{
		StudentId = studentId;
		GuardianId = guardianId;
	}

	public Guid StudentId { get; }

	public Guid GuardianId { get; }

	/// <summary>
	/// The Guardians tab is the same screen from the roster and from the waiting
	/// list, so <paramref name="source"/> names which one reached it and travels
	/// on the event for the audit record. The caller states it; nothing
	/// downstream infers it.
	/// </summary>
	public static StudentGuardian Create(Student student, Guardian guardian, StudentWriteSource source)
	{
		var link = new StudentGuardian(student.StudentId, guardian.GuardianId);
		link.Raise(new GuardianLinked(student, guardian, source));
		return link;
	}

	public void MarkUnlinked(Student student, Guardian guardian, StudentWriteSource source)
	{
		Raise(new GuardianUnlinked(student, guardian, source));
	}
}
