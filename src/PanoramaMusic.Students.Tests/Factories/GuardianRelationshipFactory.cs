using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Tests.Factories;

public static class GuardianRelationshipFactory
{
	public static GuardianRelationship Create(Guid? guardianRelationshipId = null, string name = "Mother") =>
		new(guardianRelationshipId ?? Guid.NewGuid(), name);
}