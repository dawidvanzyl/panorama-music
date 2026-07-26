using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Tests.Factories;

public static class GuardianFactory
{
	public static Guardian Create(
		Guid? guardianId = null,
		Guid? guardianRelationshipId = null,
		string firstName = "Nomvula",
		string surname = "Dube",
		string? cell = "0821234567",
		string? email = "nomvula.dube@example.com",
		bool receivesCorrespondence = true,
		bool responsibleForPayment = true,
		bool married = false) =>
		Guardian.Create(
			guardianId ?? Guid.NewGuid(),
			guardianRelationshipId ?? Guid.NewGuid(),
			firstName,
			surname,
			cell,
			email,
			receivesCorrespondence,
			responsibleForPayment,
			married);
}