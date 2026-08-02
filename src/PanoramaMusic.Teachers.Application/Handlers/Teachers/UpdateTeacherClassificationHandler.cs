using PanoramaMusic.Teachers.Application.Commands.Teachers;
using PanoramaMusic.Teachers.Application.Extensions;
using PanoramaMusic.Teachers.Application.Models;
using PanoramaMusic.Teachers.Domain.Exceptions;
using PanoramaMusic.Teachers.Domain.Interfaces;

namespace PanoramaMusic.Teachers.Application.Handlers.Teachers;

public sealed class UpdateTeacherClassificationHandler(ITeacherRepository teacherRepository)
{
	public async Task<TeacherResult> HandleAsync(UpdateTeacherClassificationCommand command, CancellationToken cancellationToken)
	{
		var teacher = await teacherRepository.GetByIdAsync(command.TeacherId, cancellationToken)
			?? throw new EntityNotFoundException($"Teacher {command.TeacherId} was not found.");

		teacher.ChangeClassification(command.Request.IsPrivate);

		await teacherRepository.UpdateClassificationAsync(teacher, cancellationToken);

		return teacher.ToResult();
	}
}