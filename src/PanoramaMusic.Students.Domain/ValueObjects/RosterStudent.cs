using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Domain.ValueObjects;

/// <summary>
/// A student as the roster lists them, carrying the teachers of the courses they
/// hold. Each teacher appears once however many courses the student has with
/// them; a student with no course has no teachers.
/// </summary>
public sealed record RosterStudent
{
	public RosterStudent(Student student, IEnumerable<Guid> teacherIds)
	{
		Student = student;
		TeacherIds = [.. teacherIds.Distinct()];
	}

	public Student Student { get; }

	public IReadOnlyCollection<Guid> TeacherIds { get; }
}