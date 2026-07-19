using PanoramaMusic.Students.Application.Extensions;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers;

public sealed class GetStudentByIdHandler(IStudentRepository studentRepository)
{
	public async Task<StudentResult> HandleAsync(Guid studentId, CancellationToken cancellationToken)
	{
		var student = await studentRepository.GetByIdAsync(studentId, cancellationToken)
			?? throw new EntityNotFoundException($"Student {studentId} was not found.");

		return student.ToResult();
	}
}