using PanoramaMusic.Teachers.Application.Extensions;
using PanoramaMusic.Teachers.Application.Models;
using PanoramaMusic.Teachers.Domain.Exceptions;
using PanoramaMusic.Teachers.Domain.Interfaces;

namespace PanoramaMusic.Teachers.Application.Handlers.Teachers;

public sealed class GetTeacherByIdHandler(ITeacherRepository teacherRepository)
{
	public async Task<TeacherResult> HandleAsync(Guid teacherId, CancellationToken cancellationToken)
	{
		var teacher = await teacherRepository.GetByIdAsync(teacherId, cancellationToken)
			?? throw new EntityNotFoundException($"Teacher {teacherId} was not found.");

		return teacher.ToResult();
	}
}