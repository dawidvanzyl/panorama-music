using PanoramaMusic.Domain;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Events.Siblings;
using PanoramaMusic.Students.Domain.Exceptions;

namespace PanoramaMusic.Students.Domain.Entities;

public sealed class Sibling : AggregateRoot
{
	public Sibling(Guid studentId, Guid siblingId)
	{
		if (studentId == siblingId)
			throw new DomainException("A student cannot be linked as their own sibling.");

		StudentId = studentId;
		SiblingId = siblingId;
	}

	public Guid StudentId { get; }

	public Guid SiblingId { get; }

	/// <summary>
	/// The Siblings tab is the same screen from the roster and from the waiting
	/// list, so <paramref name="source"/> names which one reached it and travels
	/// on the event for the audit record. The caller states it; nothing
	/// downstream infers it.
	/// </summary>
	public static Sibling Create(Student student, Student siblingStudent, StudentWriteSource source)
	{
		var sibling = new Sibling(student.StudentId, siblingStudent.StudentId);
		sibling.Raise(new SiblingAdded(student, siblingStudent, source));
		return sibling;
	}

	public void MarkRemoved(Student student, Student siblingStudent, StudentWriteSource source)
	{
		Raise(new SiblingRemoved(student, siblingStudent, source));
	}
}