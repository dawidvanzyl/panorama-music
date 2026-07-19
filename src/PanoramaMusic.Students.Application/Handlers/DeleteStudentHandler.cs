using PanoramaMusic.Students.Application.Commands;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers;

public sealed class DeleteStudentHandler(IStudentRepository studentRepository)
{
	public async Task HandleAsync(DeleteStudentCommand command, CancellationToken cancellationToken)
	{
		var student = await studentRepository.GetByIdAsync(command.StudentId, cancellationToken)
			?? throw new EntityNotFoundException($"Student {command.StudentId} was not found.");

		student.MarkDeleted();

		await studentRepository.DeleteAsync(student, cancellationToken);
	}
}