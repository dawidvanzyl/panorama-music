using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers.ExtraCurriculars;

/// <summary>
/// An activity is in use once any student takes part in it, which is exactly the
/// condition that blocks deletion. Lets the management screen say so on the row
/// instead of offering a confirmation the delete would have to reject.
/// </summary>
public sealed class CountExtraCurricularStudentsHandler(
	IExtraCurricularRepository extraCurricularRepository,
	IStudentExtraCurricularRepository studentExtraCurricularRepository)
{
	public async Task<CountExtraCurricularStudentsResult> HandleAsync(Guid extraCurricularId, CancellationToken cancellationToken)
	{
		_ = await extraCurricularRepository.GetByIdAsync(extraCurricularId, cancellationToken)
			?? throw new EntityNotFoundException($"Extra-curricular {extraCurricularId} was not found.");

		var assignedStudents = await studentExtraCurricularRepository
			.CountByExtraCurricularIdAsync(extraCurricularId, cancellationToken);

		return new CountExtraCurricularStudentsResult(assignedStudents);
	}
}