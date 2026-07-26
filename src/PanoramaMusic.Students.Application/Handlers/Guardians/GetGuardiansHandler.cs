using PanoramaMusic.Students.Application.Extensions;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers.Guardians;

public sealed class GetGuardiansHandler(IStudentRepository studentRepository, IStudentGuardianRepository studentGuardianRepository)
{
	public async Task<IList<GuardianResult>> HandleAsync(Guid studentId, CancellationToken cancellationToken)
	{
		_ = await studentRepository.GetByIdAsync(studentId, cancellationToken)
			?? throw new EntityNotFoundException($"Student {studentId} was not found.");

		var guardians = await studentGuardianRepository.GetGuardiansByStudentIdAsync(studentId, cancellationToken);

		return [.. guardians.Select(guardian => guardian.ToResult())];
	}
}