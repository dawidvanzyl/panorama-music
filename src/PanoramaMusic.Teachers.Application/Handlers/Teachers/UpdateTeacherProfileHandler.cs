using PanoramaMusic.Teachers.Application.Commands.Teachers;
using PanoramaMusic.Teachers.Application.Extensions;
using PanoramaMusic.Teachers.Application.Models;
using PanoramaMusic.Teachers.Domain.Exceptions;
using PanoramaMusic.Teachers.Domain.Interfaces;

namespace PanoramaMusic.Teachers.Application.Handlers.Teachers;

public sealed class UpdateTeacherProfileHandler(ITeacherRepository teacherRepository)
{
	public async Task<TeacherResult> HandleAsync(UpdateTeacherProfileCommand command, CancellationToken cancellationToken)
	{
		var teacher = await teacherRepository.GetByIdAsync(command.TeacherId, cancellationToken)
			?? throw new EntityNotFoundException($"Teacher {command.TeacherId} was not found.");

		var request = command.Request;
		teacher.UpdateProfile(request.FirstName, request.Surname);

		await teacherRepository.UpdateProfileAsync(teacher, cancellationToken);

		return teacher.ToResult();
	}
}