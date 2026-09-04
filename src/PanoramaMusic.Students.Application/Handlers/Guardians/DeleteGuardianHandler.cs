using PanoramaMusic.Students.Application.Commands.Guardians;
using PanoramaMusic.Students.Application.Services;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers.Guardians;

/// <summary>
/// Deletes a guardian record and every link to it across its sibling group.
/// Link rows cascade at the database level (see 09__student_guardians_table.sql).
/// Reaching every linked student is what puts this behind the same scope check
/// as an edit — it is the stronger of the two operations, not a lesser one.
/// </summary>
public sealed class DeleteGuardianHandler(
	IGuardianRepository guardianRepository,
	GuardianMaintenanceScope guardianMaintenanceScope)
{
	public async Task HandleAsync(DeleteGuardianCommand command, CancellationToken cancellationToken)
	{
		var guardian = await guardianRepository.GetByIdAsync(command.GuardianId, cancellationToken)
			?? throw new EntityNotFoundException($"Guardian {command.GuardianId} was not found.");

		await guardianMaintenanceScope.EnsureMaintainableAsync(guardian, cancellationToken);

		guardian.MarkDeleted();

		await guardianRepository.DeleteAsync(guardian, cancellationToken);
	}
}