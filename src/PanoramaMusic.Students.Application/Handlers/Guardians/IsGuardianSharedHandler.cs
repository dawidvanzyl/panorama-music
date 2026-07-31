using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers.Guardians;

/// <summary>
/// A guardian is shared when it's linked to more than one student — in this
/// domain, guardians are only ever linked to multiple students via sibling
/// sharing, so a link count above 1 is equivalent to "shared with siblings".
/// </summary>
public sealed class IsGuardianSharedHandler(IGuardianRepository guardianRepository, IStudentGuardianRepository studentGuardianRepository)
{
	public async Task<bool> HandleAsync(Guid guardianId, CancellationToken cancellationToken)
	{
		_ = await guardianRepository.GetByIdAsync(guardianId, cancellationToken)
			?? throw new EntityNotFoundException($"Guardian {guardianId} was not found.");

		var linkCount = await studentGuardianRepository.GetLinkCountAsync(guardianId, cancellationToken);
		return linkCount > 1;
	}
}