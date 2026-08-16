using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Domain.Interfaces;

public interface ILessonStructureRepository
{
	Task<IList<LessonStructure>> GetAllAsync(CancellationToken cancellationToken);

	Task<LessonStructure?> GetByIdAsync(Guid lessonStructureId, CancellationToken cancellationToken);
}