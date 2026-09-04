namespace PanoramaMusic.Students.Application.Models;

/// <summary>
/// <paramref name="Restricted"/> says this caller may not change the guardian's
/// own details, so the screen withholds the affordance instead of re-deriving
/// the rule from enrolment data it would otherwise have to fetch.
/// </summary>
public sealed record GuardianResult(
	Guid GuardianId,
	Guid GuardianRelationshipId,
	string FirstName,
	string Surname,
	string? Cell,
	string? Email,
	bool ReceivesCorrespondence,
	bool ResponsibleForPayment,
	bool Married,
	bool Restricted);
