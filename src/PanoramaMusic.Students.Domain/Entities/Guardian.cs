using PanoramaMusic.Domain;
using PanoramaMusic.Students.Domain.Events.Guardians;

namespace PanoramaMusic.Students.Domain.Entities;

public sealed class Guardian : AggregateRoot
{
	public Guardian(
		Guid guardianId,
		Guid guardianRelationshipId,
		string firstName,
		string surname,
		string? cell,
		string? email,
		bool receivesCorrespondence,
		bool responsibleForPayment,
		bool married)
	{
		GuardianId = guardianId;
		GuardianRelationshipId = guardianRelationshipId;
		FirstName = firstName;
		Surname = surname;
		Cell = cell;
		Email = email;
		ReceivesCorrespondence = receivesCorrespondence;
		ResponsibleForPayment = responsibleForPayment;
		Married = married;
	}

	public Guid GuardianId { get; }

	public Guid GuardianRelationshipId { get; private set; }

	public string FirstName { get; private set; }

	public string Surname { get; private set; }

	public string? Cell { get; private set; }

	public string? Email { get; private set; }

	public bool ReceivesCorrespondence { get; private set; }

	public bool ResponsibleForPayment { get; private set; }

	public bool Married { get; private set; }

	public static Guardian Create(
		Guid guardianId,
		Guid guardianRelationshipId,
		string firstName,
		string surname,
		string? cell,
		string? email,
		bool receivesCorrespondence,
		bool responsibleForPayment,
		bool married)
	{
		var guardian = new Guardian(
			guardianId,
			guardianRelationshipId,
			firstName,
			surname,
			cell,
			email,
			receivesCorrespondence,
			responsibleForPayment,
			married);

		guardian.Raise(new GuardianCreated(guardian));
		return guardian;
	}

	/// <summary>
	/// Snapshots the current values as the "before" picture, applies the new
	/// values to this instance, and raises a <see cref="GuardianUpdated"/>
	/// event carrying both the before snapshot and this now-updated instance.
	/// A guardian is shared across a sibling group as a single row, so this
	/// update is visible to every student linked to it.
	/// </summary>
	public void Update(
		Guid guardianRelationshipId,
		string firstName,
		string surname,
		string? cell,
		string? email,
		bool receivesCorrespondence,
		bool responsibleForPayment,
		bool married)
	{
		var before = new Guardian(
			GuardianId,
			GuardianRelationshipId,
			FirstName,
			Surname,
			Cell,
			Email,
			ReceivesCorrespondence,
			ResponsibleForPayment,
			Married);

		GuardianRelationshipId = guardianRelationshipId;
		FirstName = firstName;
		Surname = surname;
		Cell = cell;
		Email = email;
		ReceivesCorrespondence = receivesCorrespondence;
		ResponsibleForPayment = responsibleForPayment;
		Married = married;

		Raise(new GuardianUpdated(before, this));
	}

	public void MarkDeleted()
	{
		Raise(new GuardianDeleted(this));
	}
}