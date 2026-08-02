using PanoramaMusic.Teachers.Application.Extensions;
using PanoramaMusic.Teachers.Application.Models;
using PanoramaMusic.Teachers.Domain.Interfaces;

namespace PanoramaMusic.Teachers.Application.Handlers.Teachers;

public sealed class GetTeachersHandler(ITeacherRepository teacherRepository)
{
	public async Task<IList<TeacherResult>> HandleAsync(CancellationToken cancellationToken)
	{
		var teachers = await teacherRepository.GetAllAsync(cancellationToken);

		return [.. teachers.Select(teacher => teacher.ToResult())];
	}
}