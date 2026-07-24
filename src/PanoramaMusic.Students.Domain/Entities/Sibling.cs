using PanoramaMusic.Domain;
using PanoramaMusic.Students.Domain.Events;
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

	public static Sibling Create(Student student, Student siblingStudent)
	{
		var sibling = new Sibling(student.StudentId, siblingStudent.StudentId);
		sibling.Raise(new SiblingAdded(student, siblingStudent));
		return sibling;
	}

	public void MarkRemoved(Student student, Student siblingStudent)
	{
		Raise(new SiblingRemoved(student, siblingStudent));
	}
}