using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;

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
		bool married = false,
		// The roster is where a guardian's students live unless a test says
		// otherwise, so only the audit-surface tests have to name one.
		StudentWriteSource source = StudentWriteSource.Roster) =>
		Guardian.Create(
			guardianId ?? Guid.NewGuid(),
			guardianRelationshipId ?? Guid.NewGuid(),
			firstName,
			surname,
			cell,
			email,
			receivesCorrespondence,
			responsibleForPayment,
			married,
			source);
}