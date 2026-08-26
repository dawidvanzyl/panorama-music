using PanoramaMusic.Students.Application.Extensions;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers.StudentExtraCurriculars;

/// <summary>
/// The activities a student takes part in, each carrying its description, phase
/// and practice times. The practice-time order is the activity aggregate's own —
/// day of week from Monday, then start time — so nothing re-sorts here.
/// </summary>
public sealed class GetStudentExtraCurricularsHandler(
	IStudentRepository studentRepository,
	IStudentExtraCurricularRepository studentExtraCurricularRepository)
{
	public async Task<IList<ExtraCurricularResult>> HandleAsync(Guid studentId, CancellationToken cancellationToken)
	{
		// A student who does not exist is a different answer from one who takes
		// part in nothing, so the student is read rather than the empty list being
		// allowed to stand in for both.
		_ = await studentRepository.GetByIdAsync(studentId, cancellationToken)
			?? throw new EntityNotFoundException($"Student {studentId} was not found.");

		var assignments = await studentExtraCurricularRepository.GetByStudentIdAsync(studentId, cancellationToken);

		return [.. assignments.Select(assignment => assignment.ExtraCurricular.ToResult())];
	}
}
