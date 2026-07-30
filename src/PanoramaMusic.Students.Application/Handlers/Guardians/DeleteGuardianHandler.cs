using PanoramaMusic.Students.Application.Commands.Guardians;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers.Guardians;

/// <summary>
/// Deletes a guardian record and every link to it across its sibling group.
/// Link rows cascade at the database level (see 09__student_guardians_table.sql).
/// </summary>
public sealed class DeleteGuardianHandler(IGuardianRepository guardianRepository)
{
	public async Task HandleAsync(DeleteGuardianCommand command, CancellationToken cancellationToken)
	{
		var guardian = await guardianRepository.GetByIdAsync(command.GuardianId, cancellationToken)
			?? throw new EntityNotFoundException($"Guardian {command.GuardianId} was not found.");

		guardian.MarkDeleted();

		await guardianRepository.DeleteAsync(guardian, cancellationToken);
	}
}