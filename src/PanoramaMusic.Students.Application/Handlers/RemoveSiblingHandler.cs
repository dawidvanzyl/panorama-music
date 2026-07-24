using PanoramaMusic.Students.Application.Commands;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers;

public sealed class RemoveSiblingHandler(IStudentRepository studentRepository, ISiblingRepository siblingRepository)
{
	public async Task HandleAsync(RemoveSiblingCommand command, CancellationToken cancellationToken)
	{
		var student = await studentRepository.GetByIdAsync(command.StudentId, cancellationToken)
			?? throw new EntityNotFoundException($"Student {command.StudentId} was not found.");

		var siblings = await siblingRepository.GetSiblingsAsync(command.StudentId, cancellationToken);
		var siblingStudent = siblings.FirstOrDefault(s => s.StudentId == command.SiblingId)
			?? throw new EntityNotFoundException($"Sibling link between {command.StudentId} and {command.SiblingId} was not found.");

		var sibling = new Sibling(student.StudentId, siblingStudent.StudentId);
		sibling.MarkRemoved(student, siblingStudent);

		await siblingRepository.DeleteAsync(sibling, cancellationToken);
	}
}