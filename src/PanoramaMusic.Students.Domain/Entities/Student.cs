using PanoramaMusic.Domain;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Events;

namespace PanoramaMusic.Students.Domain.Entities;

public sealed class Student : AggregateRoot
{
	public Student(
		Guid studentId,
		string firstName,
		string lastName,
		DateOnly dateOfBirth,
		GradeType grade,
		ClassType @class,
		PhaseType phase,
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

	public ClassType Class { get; private set; }

	public PhaseType Phase { get; private set; }

	public Language Language { get; private set; }

	public static Student Create(
		Guid studentId,
		string firstName,
		string lastName,
		DateOnly dateOfBirth,
		GradeType grade,
		ClassType @class,
		PhaseType phase,
		Language language)
	{
		var student = new Student(studentId, firstName, lastName, dateOfBirth, grade, @class, phase, language);
		student.Raise(new StudentCreated(student));
		return student;
	}

	/// <summary>
	/// Snapshots the current values as the "before" picture, applies the new
	/// values to this instance, and raises a <see cref="StudentUpdated"/>
	/// event carrying both the before snapshot and this now-updated instance.
	/// </summary>
	public void Update(
		string firstName,
		string lastName,
		DateOnly dateOfBirth,
		GradeType grade,
		ClassType @class,
		PhaseType phase,
		Language language)
	{
		var before = new Student(StudentId, FirstName, LastName, DateOfBirth, Grade, Class, Phase, Language);

		FirstName = firstName;
		LastName = lastName;
		DateOfBirth = dateOfBirth;
		Grade = grade;
		Class = @class;
		Phase = phase;
		Language = language;

		Raise(new StudentUpdated(before, this));
	}

	public void MarkDeleted()
	{
		Raise(new StudentDeleted(this));
	}
}