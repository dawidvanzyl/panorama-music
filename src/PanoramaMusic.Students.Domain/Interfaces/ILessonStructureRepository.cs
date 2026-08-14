using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Domain.Interfaces;

public interface ILessonStructureRepository
{
	Task<IList<LessonStructure>> GetAllAsync(CancellationToken cancellationToken);
}