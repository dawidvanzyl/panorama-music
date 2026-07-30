namespace PanoramaMusic.Students.Application.Models;

public sealed record GuardianResult(
	Guid GuardianId,
	Guid GuardianRelationshipId,
	string FirstName,
	string Surname,
	string? Cell,
	string? Email,
	bool ReceivesCorrespondence,
	bool ResponsibleForPayment,
	bool Married);