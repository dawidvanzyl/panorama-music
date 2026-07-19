using PanoramaMusic.Students.Application.Extensions;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers;

public sealed class GetStudentsHandler(IStudentRepository studentRepository)
{
	public async Task<IList<StudentResult>> HandleAsync(CancellationToken cancellationToken)
	{
		var students = await studentRepository.GetAllAsync(cancellationToken);

		return [.. students.Select(student => student.ToResult())];
	}
}