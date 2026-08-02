using PanoramaMusic.Teachers.Application.Commands.Teachers;
using PanoramaMusic.Teachers.Application.Extensions;
using PanoramaMusic.Teachers.Application.Models;
using PanoramaMusic.Teachers.Domain.Entities;
using PanoramaMusic.Teachers.Domain.Interfaces;

namespace PanoramaMusic.Teachers.Application.Handlers.Teachers;

public sealed class CreateTeacherHandler(ITeacherRepository teacherRepository)
{
	public async Task<TeacherResult> HandleAsync(CreateTeacherCommand command, CancellationToken cancellationToken)
	{
		var request = command.Request;
		var teacher = Teacher.Create(
			Guid.NewGuid(),
			request.FirstName,
			request.Surname,
			request.IsPrivate);

		await teacherRepository.CreateAsync(teacher, cancellationToken);

		return teacher.ToResult();
	}
}