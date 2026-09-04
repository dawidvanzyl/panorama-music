using PanoramaMusic.Students.Application.Extensions;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Application.Services;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers.Guardians;

/// <summary>
/// Re-links every sibling-group guardian the student is currently missing.
/// One-directional: pulls guardians into this student only, writing nothing to
/// any sibling — which is why it stays open to a caller the guardian
/// maintenance scope otherwise restricts.
/// </summary>
public sealed class SyncGuardiansHandler(
	IStudentRepository studentRepository,
	IStudentGuardianRepository studentGuardianRepository,
	GuardianMaintenanceScope guardianMaintenanceScope)
{
	public async Task<IList<GuardianResult>> HandleAsync(Guid studentId, CancellationToken cancellationToken)
	{
		var student = await studentRepository.GetByIdAsync(studentId, cancellationToken)
			?? throw new EntityNotFoundException($"Student {studentId} was not found.");

		var missingGuardians = await studentGuardianRepository.GetMissingSiblingGuardiansAsync(studentId, cancellationToken);

		foreach (var guardian in missingGuardians)
		{
			var link = StudentGuardian.Create(student, guardian);
			await studentGuardianRepository.CreateAsync(link, cancellationToken);
		}

		// A pulled guardian is one a sibling already holds, so any of them may
		// belong to an enrolled sibling and come back restricted.
		var restrictedIds = await guardianMaintenanceScope.RestrictedGuardianIdsAsync(studentId, cancellationToken);

		return [.. missingGuardians.Select(guardian => guardian.ToResult(restrictedIds.Contains(guardian.GuardianId)))];
	}
}