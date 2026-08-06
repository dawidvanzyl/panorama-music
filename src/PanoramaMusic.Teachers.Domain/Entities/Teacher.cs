using PanoramaMusic.Domain;
using PanoramaMusic.Teachers.Domain.Events.Teachers;

namespace PanoramaMusic.Teachers.Domain.Entities;

public sealed class Teacher : AggregateRoot
{
	public Teacher(
		Guid teacherId,
		string firstName,
		string surname,
		bool isPrivate,
		bool isActive,
		Guid? linkedAccountId)
	{
		TeacherId = teacherId;
		FirstName = firstName;
		Surname = surname;
		IsPrivate = isPrivate;
		IsActive = isActive;
		LinkedAccountId = linkedAccountId;
	}

	public Guid TeacherId { get; }

	public string FirstName { get; private set; }

	public string Surname { get; private set; }

	/// <summary>
	/// Informational only — must not gate any other behaviour. True means the
	/// teacher is paid directly by parents; false means paid by the school.
	/// </summary>
	public bool IsPrivate { get; private set; }

	public bool IsActive { get; private set; }

	/// <summary>Reserved for a future story — no linking logic exists yet.</summary>
	public Guid? LinkedAccountId { get; private set; }

	public static Teacher Create(
		Guid teacherId,
		string firstName,
		string surname,
		bool isPrivate)
	{
		var teacher = new Teacher(
			teacherId,
			firstName,
			surname,
			isPrivate,
			isActive: true,
			linkedAccountId: null);

		teacher.Raise(new TeacherCreated(teacher));
		return teacher;
	}

	/// <summary>
	/// Snapshots the current values as the "before" picture, applies the new
	/// names to this instance, and raises a <see cref="TeacherProfileUpdated"/>
	/// event carrying both the before snapshot and this now-updated instance.
	/// </summary>
	public void UpdateProfile(string firstName, string surname)
	{
		var before = Snapshot();

		FirstName = firstName;
		Surname = surname;

		Raise(new TeacherProfileUpdated(before, this));
	}

	/// <summary>
	/// Changes the employment classification on its own — it is maintained
	/// independently of the profile names and carries its own audit event.
	/// </summary>
	public void ChangeClassification(bool isPrivate)
	{
		var before = Snapshot();

		IsPrivate = isPrivate;

		Raise(new TeacherClassificationChanged(before, this));
	}

	private Teacher Snapshot() =>
		new(TeacherId, FirstName, Surname, IsPrivate, IsActive, LinkedAccountId);
}