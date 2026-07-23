using PanoramaMusic.Students.Application.Extensions;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers;

public sealed class GetSiblingsHandler(IStudentRepository studentRepository, ISiblingRepository siblingRepository)
{
	public async Task<IList<StudentResult>> HandleAsync(Guid studentId, CancellationToken cancellationToken)
	{
		_ = await studentRepository.GetByIdAsync(studentId, cancellationToken)
			?? throw new EntityNotFoundException($"Student {studentId} was not found.");

		var siblings = await siblingRepository.GetSiblingsAsync(studentId, cancellationToken);

		return [.. siblings.Select(student => student.ToResult())];
	}
}