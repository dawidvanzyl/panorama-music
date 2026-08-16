using PanoramaMusic.Students.Application.Extensions;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers.LessonStructures;

public sealed class GetLessonStructuresHandler(ILessonStructureRepository lessonStructureRepository)
{
	public async Task<IList<LessonStructureResult>> HandleAsync(CancellationToken cancellationToken)
	{
		var lessonStructures = await lessonStructureRepository.GetAllAsync(cancellationToken);

		return [.. lessonStructures.Select(lessonStructure => lessonStructure.ToResult())];
	}
}