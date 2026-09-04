using PanoramaMusic.Domain;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Events.Students;

namespace PanoramaMusic.Students.Domain.Entities;

public sealed class Student : AggregateRoot
{
	public Student(
		Guid studentId,
		string firstName,
		string lastName,
		DateOnly dateOfBirth,
		GradeType grade,
		ClassType? @class,
		PhaseType? phase,
		Language language)
	{
		StudentId = studentId;
		FirstName = firstName;
		LastName = lastName;
		DateOfBirth = dateOfBirth;
		Grade = grade;
		Class = @class;
		Phase = phase;
		Language = language;
	}

	public Guid StudentId { get; }

	public string FirstName { get; private set; }

	public string LastName { get; private set; }

	public DateOnly DateOfBirth { get; private set; }

	public GradeType Grade { get; private set; }

	public ClassType? Class { get; private set; }

	public PhaseType? Phase { get; private set; }

	public Language Language { get; private set; }

	/// <summary>
	/// Raises <see cref="StudentCreated"/> carrying the surface the student was
	/// created through — a capture onto the waiting list and a roster addition
	/// both land here, on the same terms as <see cref="Update"/>.
	/// </summary>
	public static Student Create(
		Guid studentId,
		string firstName,
		string lastName,
		DateOnly dateOfBirth,
		GradeType grade,
		ClassType? @class,
		PhaseType? phase,
		Language language,
		StudentWriteSource source)
	{
		var student = new Student(
			studentId,
			firstName,
			lastName,
			dateOfBirth,
			grade,
			@class,
			phase,
			language);

		student.Raise(new StudentCreated(student, source));
		return student;
	}

	/// <summary>
	/// Snapshots the current values as the "before" picture, applies the new
	/// values to this instance, and raises a <see cref="StudentUpdated"/>
	/// event carrying both the before snapshot and this now-updated instance.
	/// <para>
	/// <paramref name="source"/> names the surface the write came through and
	/// travels on the event so the audit record can say which one it was. The
	/// caller states it; nothing downstream infers it.
	/// </para>
	/// </summary>
	public void Update(
		string firstName,
		string lastName,
		DateOnly dateOfBirth,
		GradeType grade,
		ClassType? @class,
		PhaseType? phase,
		Language language,
		StudentWriteSource source)
	{
		var before = new Student(
			StudentId,
			FirstName,
			LastName,
			DateOfBirth,
			Grade,
			Class,
			Phase,
			Language);

		FirstName = firstName;
		LastName = lastName;
		DateOfBirth = dateOfBirth;
		Grade = grade;
		Class = @class;
		Phase = phase;
		Language = language;

		Raise(new StudentUpdated(before, this, source));
	}

	/// <summary>
	/// Raises <see cref="StudentDeleted"/> carrying the surface the deletion
	/// came through, on the same terms as <see cref="Update"/>.
	/// </summary>
	public void MarkDeleted(StudentWriteSource source)
	{
		Raise(new StudentDeleted(this, source));
	}

	/// <summary>
	/// How a student reads wherever one has to be named to a person — an audit
	/// event's target, a refusal message.
	/// </summary>
	public override string ToString() => $"{FirstName} {LastName}";
}