using PanoramaMusic.Domain;
using PanoramaMusic.Students.Domain.Events.GuardianRelationships;

namespace PanoramaMusic.Students.Domain.Entities;

public sealed class GuardianRelationship : AggregateRoot
{
	public GuardianRelationship(Guid guardianRelationshipId, string name)
	{
		GuardianRelationshipId = guardianRelationshipId;
		Name = name;
	}

	public Guid GuardianRelationshipId { get; }

	public string Name { get; private set; }

	public static GuardianRelationship Create(Guid guardianRelationshipId, string name)
	{
		var relationship = new GuardianRelationship(guardianRelationshipId, name);

		relationship.Raise(new GuardianRelationshipCreated(relationship));
		return relationship;
	}

	/// <summary>
	/// Renaming is permitted at any time, including while guardians reference
	/// this type — a guardian points at the identifier, not the name.
	/// </summary>
	public void Rename(string name)
	{
		var before = new GuardianRelationship(GuardianRelationshipId, Name);

		Name = name;

		Raise(new GuardianRelationshipRenamed(before, this));
	}

	public void MarkDeleted()
	{
		Raise(new GuardianRelationshipDeleted(this));
	}
}