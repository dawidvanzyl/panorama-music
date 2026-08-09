using PanoramaMusic.Teachers.Application.Commands.Teachers;
using PanoramaMusic.Teachers.Application.Models;
using PanoramaMusic.Teachers.Application.Services;
using PanoramaMusic.Teachers.Domain.Exceptions;
using PanoramaMusic.Teachers.Domain.Interfaces;

namespace PanoramaMusic.Teachers.Application.Handlers.Teachers;

/// <summary>
/// Returns a deactivated teacher to active. Deliberately not the inverse of
/// deactivation: the banking details deleted then are not retained anywhere and
/// cannot be restored, so a reactivated teacher comes back with none.
/// </summary>
public sealed class ReactivateTeacherHandler(
	ITeacherRepository teacherRepository,
	TeacherResultComposer resultComposer)
{
	public async Task<TeacherResult> HandleAsync(ReactivateTeacherCommand command, CancellationToken cancellationToken)
	{
		var teacher = await teacherRepository.GetByIdAsync(command.TeacherId, cancellationToken)
			?? throw new EntityNotFoundException($"Teacher {command.TeacherId} was not found.");

		teacher.Reactivate();

		await teacherRepository.ReactivateAsync(teacher, cancellationToken);

		return await resultComposer.ComposeAsync(teacher, cancellationToken);
	}
}