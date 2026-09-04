using PanoramaMusic.Students.Application.Extensions;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Application.Services;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers.Guardians;

/// <summary>
/// Read-only preview of what a Sync would link — guardians held by a sibling
/// but missing from this student — without persisting anything. Lets the
/// frontend decide whether to show "Sync Guardians" with a single request
/// instead of fetching every sibling's guardian list itself.
/// </summary>
public sealed class GetMissingSiblingGuardiansHandler(
	IStudentRepository studentRepository,
	IStudentGuardianRepository studentGuardianRepository,
	GuardianMaintenanceScope guardianMaintenanceScope)
{
	public async Task<IList<GuardianResult>> HandleAsync(Guid studentId, CancellationToken cancellationToken)
	{
		_ = await studentRepository.GetByIdAsync(studentId, cancellationToken)
			?? throw new EntityNotFoundException($"Student {studentId} was not found.");

		var missingGuardians = await studentGuardianRepository.GetMissingSiblingGuardiansAsync(studentId, cancellationToken);
		var restrictedIds = await guardianMaintenanceScope.RestrictedGuardianIdsAsync(studentId, cancellationToken);

		return [.. missingGuardians.Select(guardian => guardian.ToResult(restrictedIds.Contains(guardian.GuardianId)))];
	}
}