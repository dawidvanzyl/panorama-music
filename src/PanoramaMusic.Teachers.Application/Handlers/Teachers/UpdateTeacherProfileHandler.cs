using PanoramaMusic.Teachers.Application.Commands.Teachers;
using PanoramaMusic.Teachers.Application.Models;
using PanoramaMusic.Teachers.Application.Services;
using PanoramaMusic.Teachers.Domain.Exceptions;
using PanoramaMusic.Teachers.Domain.Interfaces;

namespace PanoramaMusic.Teachers.Application.Handlers.Teachers;

public sealed class UpdateTeacherProfileHandler(
	ITeacherRepository teacherRepository,
	TeacherResultComposer resultComposer)
{
	public async Task<TeacherResult> HandleAsync(UpdateTeacherProfileCommand command, CancellationToken cancellationToken)
	{
		var teacher = await teacherRepository.GetByIdAsync(command.TeacherId, cancellationToken)
			?? throw new EntityNotFoundException($"Teacher {command.TeacherId} was not found.");

		var request = command.Request;
		teacher.UpdateProfile(request.FirstName, request.Surname);

		await teacherRepository.UpdateProfileAsync(teacher, cancellationToken);

		return await resultComposer.ComposeAsync(teacher, cancellationToken);
	}
}