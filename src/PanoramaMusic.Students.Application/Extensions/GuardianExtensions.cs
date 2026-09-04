using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Application.Extensions;

public static class GuardianExtensions
{
	public static GuardianResult ToResult(this Guardian guardian, bool restricted = false) =>
		new(
			guardian.GuardianId,
			guardian.GuardianRelationshipId,
			guardian.FirstName,
			guardian.Surname,
			guardian.Cell,
			guardian.Email,
			guardian.ReceivesCorrespondence,
			guardian.ResponsibleForPayment,
			guardian.Married,
			restricted);

	public static GuardianRelationshipResult ToResult(this GuardianRelationship relationship) =>
		new(relationship.GuardianRelationshipId, relationship.Name);
}