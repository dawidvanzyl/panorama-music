using PanoramaMusic.Teachers.Application.Commands.Teachers;
using PanoramaMusic.Teachers.Domain.Exceptions;
using PanoramaMusic.Teachers.Domain.Interfaces;

namespace PanoramaMusic.Teachers.Application.Handlers.Teachers;

public sealed class DeleteTeacherHandler(ITeacherRepository teacherRepository)
{
	public async Task HandleAsync(DeleteTeacherCommand command, CancellationToken cancellationToken)
	{
		var teacher = await teacherRepository.GetByIdAsync(command.TeacherId, cancellationToken)
			?? throw new EntityNotFoundException($"Teacher {command.TeacherId} was not found.");

		// The deactivate-before-delete guard lives on the aggregate, so the
		// refusal is the same whichever caller reaches it.
		teacher.Delete();

		await teacherRepository.DeleteAsync(teacher, cancellationToken);
	}
}