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
		// A link is what gives a teacher self-service access to their own record
		// and its banking details. Handing that to a teacher who has been stood
		// down would reopen, through the account, exactly what deactivation
		// closed — so a deactivated teacher is refused whichever account is
		// offered. Unlinking carries no such bar: removing access from a
		// deactivated teacher is never the wrong direction.
		if (!IsActive)
			throw new DomainException(TeacherAccountLinkMessages.TeacherNotActive);

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

	/// <summary>
	/// Takes the teacher out of active service. The record and its history
	/// survive — only <see cref="Delete"/> removes them. The banking details that
	/// go with a deactivation are their own aggregate and are deleted alongside
	/// this change rather than from here.
	/// </summary>
	public void Deactivate()
	{
		if (!IsActive)
			throw new DomainException(TeacherLifecycleMessages.TeacherAlreadyDeactivated);

		IsActive = false;

		Raise(new TeacherDeactivated(this));
	}

	/// <summary>
	/// Returns a deactivated teacher to active. Nothing is restored with them:
	/// the banking details deleted at deactivation are gone and must be captured
	/// again.
	/// </summary>
	public void Reactivate()
	{
		if (IsActive)
			throw new DomainException(TeacherLifecycleMessages.TeacherAlreadyActive);

		IsActive = true;

		Raise(new TeacherReactivated(this));
	}

	/// <summary>
	/// Permanently removes the teacher. Guarded rather than merely hidden: the
	/// interface withholds the action while a teacher is active, but this is what
	/// actually refuses it.
	/// <para>
	/// The guards are a plain sequence so a further one — deletion is also
	/// refused while the teacher is assigned to a course — can be added once
	/// courses exist, without reshaping the path.
	/// </para>
	/// </summary>
	public void Delete()
	{
		if (IsActive)
			throw new DomainException(TeacherLifecycleMessages.TeacherMustBeDeactivatedBeforeDeletion);

		Raise(new TeacherDeleted(this));
	}

	private Teacher Snapshot() =>
		new(TeacherId, FirstName, Surname, IsPrivate, IsActive, LinkedAccountId);
}