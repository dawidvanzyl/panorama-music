using PanoramaMusic.Teachers.Application.Models;
using PanoramaMusic.Teachers.Application.Services;
using PanoramaMusic.Teachers.Domain.Interfaces;

namespace PanoramaMusic.Teachers.Application.Handlers.Teachers;

public sealed class GetTeachersHandler(
	ITeacherRepository teacherRepository,
	TeacherResultComposer resultComposer)
{
	public async Task<IList<TeacherResult>> HandleAsync(CancellationToken cancellationToken)
	{
		var teachers = await teacherRepository.GetAllAsync(cancellationToken);

		return await resultComposer.ComposeManyAsync(teachers, cancellationToken);
	}
}