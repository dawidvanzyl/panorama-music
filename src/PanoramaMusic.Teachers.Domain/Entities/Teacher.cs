using PanoramaMusic.Domain;
using PanoramaMusic.Teachers.Domain.Events.Teachers;
using PanoramaMusic.Teachers.Domain.Exceptions;
using PanoramaMusic.Teachers.Domain.Messages;

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

	/// <summary>
	/// The login account this teacher maintains their own record through, or
	/// null when the teacher has no account. Optional — a teacher without one is
	/// a valid, complete record.
	/// </summary>
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

	/// <summary>
	/// Attaches a login account. A link is established or removed, never changed
	/// in place — relinking a teacher that already has an account would leave the
	/// audit trail ambiguous about which account was replaced, so it is refused.
	/// </summary>
	public void LinkAccount(Guid accountId)
	{
		if (LinkedAccountId is not null)
			throw new DomainException(TeacherAccountLinkMessages.TeacherAlreadyLinked);

		LinkedAccountId = accountId;

		Raise(new TeacherAccountLinked(this, accountId));
	}

	/// <summary>
	/// Detaches the login account, leaving the teacher record intact and active.
	/// </summary>
	public void UnlinkAccount()
	{
		if (LinkedAccountId is null)
			throw new DomainException(TeacherAccountLinkMessages.TeacherNotLinked);

		var previousAccountId = LinkedAccountId.Value;
		LinkedAccountId = null;

		Raise(new TeacherAccountUnlinked(this, previousAccountId));
	}

	private Teacher Snapshot() =>
		new(TeacherId, FirstName, Surname, IsPrivate, IsActive, LinkedAccountId);
}