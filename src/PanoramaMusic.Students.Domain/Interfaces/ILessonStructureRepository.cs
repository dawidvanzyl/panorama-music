using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Domain.Interfaces;

public interface ILessonStructureRepository
{
	Task<IList<LessonStructure>> GetAllAsync(CancellationToken cancellationToken);

	/// <summary>
	/// The seeded structures the school runs an instrument course under. A
	/// structure is only seeded reference data until a course is created against
	/// it; this is the narrower set a student may be made to wait for.
	/// </summary>
	Task<IList<LessonStructure>> GetOfferedAsync(CancellationToken cancellationToken);

	Task<LessonStructure?> GetByIdAsync(Guid lessonStructureId, CancellationToken cancellationToken);
}