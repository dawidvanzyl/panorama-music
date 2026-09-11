using PanoramaMusic.Students.Application.Extensions;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers.LessonStructures;

/// <summary>
/// The structures a student may be made to wait for: the seeded combinations
/// the school runs an instrument course under. The waiting list's own surfaces
/// read this rather than the full seeded grid, so a student is never captured
/// waiting for a combination that has nothing to enrol them into.
/// </summary>
public sealed class GetOfferedLessonStructuresHandler(ILessonStructureRepository lessonStructureRepository)
{
	public async Task<IList<LessonStructureResult>> HandleAsync(CancellationToken cancellationToken)
	{
		var lessonStructures = await lessonStructureRepository.GetOfferedAsync(cancellationToken);

		return [.. lessonStructures.Select(lessonStructure => lessonStructure.ToResult())];
	}
}