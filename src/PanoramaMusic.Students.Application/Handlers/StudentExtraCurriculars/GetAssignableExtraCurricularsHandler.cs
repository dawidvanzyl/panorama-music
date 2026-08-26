using PanoramaMusic.Students.Application.Extensions;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers.StudentExtraCurriculars;

/// <summary>
/// The activities the student may be assigned to: those offered to their own
/// phase that they do not already take part in. Both narrowings are the query's,
/// so the whole answer arrives in one read rather than the catalogue being pulled
/// back and filtered here.
/// </summary>
public sealed class GetAssignableExtraCurricularsHandler(
	IStudentRepository studentRepository,
	IStudentExtraCurricularRepository studentExtraCurricularRepository)
{
	public async Task<IList<ExtraCurricularResult>> HandleAsync(Guid studentId, CancellationToken cancellationToken)
	{
		_ = await studentRepository.GetByIdAsync(studentId, cancellationToken)
			?? throw new EntityNotFoundException($"Student {studentId} was not found.");

		var assignable = await studentExtraCurricularRepository.GetAssignableAsync(studentId, cancellationToken);

		return [.. assignable.Select(extraCurricular => extraCurricular.ToResult())];
	}
}