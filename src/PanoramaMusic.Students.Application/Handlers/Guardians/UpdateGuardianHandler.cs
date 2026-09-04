using PanoramaMusic.Students.Application.Commands.Guardians;
using PanoramaMusic.Students.Application.Extensions;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Application.Services;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers.Guardians;

public sealed class UpdateGuardianHandler(
	IGuardianRepository guardianRepository,
	IGuardianRelationshipRepository guardianRelationshipRepository,
	GuardianMaintenanceScope guardianMaintenanceScope,
	StudentWriteSourceResolver studentWriteSourceResolver)
{
	public async Task<GuardianResult> HandleAsync(UpdateGuardianCommand command, CancellationToken cancellationToken)
	{
		var guardian = await guardianRepository.GetByIdAsync(command.GuardianId, cancellationToken)
			?? throw new EntityNotFoundException($"Guardian {command.GuardianId} was not found.");

		await guardianMaintenanceScope.EnsureMaintainableAsync(guardian, cancellationToken);

		var request = command.Request;
		_ = await guardianRelationshipRepository.GetByIdAsync(request.GuardianRelationshipId, cancellationToken)
			?? throw new DomainException($"Guardian relationship {request.GuardianRelationshipId} was not found.");

		// The route names a guardian and no student, so the guardian's own links
		// are what say which surface could have reached it.
		var source = await studentWriteSourceResolver.ForGuardianAsync(guardian.GuardianId, cancellationToken);

		guardian.Update(
			request.GuardianRelationshipId,
			request.FirstName,
			request.Surname,
			request.Cell,
			request.Email,
			request.ReceivesCorrespondence,
			request.ResponsibleForPayment,
			request.Married,
			source);

		await guardianRepository.UpdateAsync(guardian, cancellationToken);

		return guardian.ToResult();
	}
}