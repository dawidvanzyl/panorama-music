using PanoramaMusic.Students.Application.Extensions;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers.Guardians;

/// <summary>
/// Re-links every sibling-group guardian the student is currently missing.
/// One-directional: pulls guardians into this student only.
/// </summary>
public sealed class SyncGuardiansHandler(IStudentRepository studentRepository, IStudentGuardianRepository studentGuardianRepository)
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

		return [.. missingGuardians.Select(guardian => guardian.ToResult())];
	}
}