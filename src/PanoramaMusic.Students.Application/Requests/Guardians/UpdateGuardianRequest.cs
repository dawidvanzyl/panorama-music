namespace PanoramaMusic.Students.Application.Requests.Guardians;

public sealed record UpdateGuardianRequest(
	Guid GuardianRelationshipId,
	string FirstName,
	string Surname,
	string? Cell,
	string? Email,
	bool ReceivesCorrespondence,
	bool ResponsibleForPayment,
	bool Married);