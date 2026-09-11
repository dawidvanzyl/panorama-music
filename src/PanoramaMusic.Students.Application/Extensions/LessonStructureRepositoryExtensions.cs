using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;
using PanoramaMusic.Students.Domain.Messages;

namespace PanoramaMusic.Students.Application.Extensions;

public static class LessonStructureRepositoryExtensions
{
	/// <summary>
	/// Resolves the structure a student may be made to wait for. Two conditions,
	/// and a caller can tell which of them failed: the structure must be a
	/// seeded one at all, and the school must run an instrument course under it.
	/// A wait with nothing behind it is a wait that can never be enrolled.
	/// <para>
	/// The offered set comes from the same read the waiting-list surfaces build
	/// their choices from, so what the screen allows and what the endpoint
	/// accepts cannot drift apart.
	/// </para>
	/// </summary>
	public static async Task<LessonStructure> GetOfferedByIdAsync(
		this ILessonStructureRepository lessonStructureRepository,
		Guid lessonStructureId,
		CancellationToken cancellationToken)
	{
		var lessonStructure = await lessonStructureRepository.GetByIdAsync(lessonStructureId, cancellationToken)
			?? throw new DomainException($"Lesson structure '{lessonStructureId}' does not exist.");

		var offered = await lessonStructureRepository.GetOfferedAsync(cancellationToken);

		return offered.Any(structure => structure.LessonStructureId == lessonStructureId)
			? lessonStructure
			: throw new DomainException(WaitingListMessages.LessonStructureIsNotOffered);
	}
}