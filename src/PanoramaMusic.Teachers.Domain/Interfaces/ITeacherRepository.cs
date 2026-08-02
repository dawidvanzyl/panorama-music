using PanoramaMusic.Teachers.Domain.Entities;

namespace PanoramaMusic.Teachers.Domain.Interfaces;

public interface ITeacherRepository
{
	Task<Teacher?> GetByIdAsync(Guid teacherId, CancellationToken cancellationToken);

	Task<IList<Teacher>> GetAllAsync(CancellationToken cancellationToken);

	Task CreateAsync(Teacher teacher, CancellationToken cancellationToken);

	Task UpdateProfileAsync(Teacher teacher, CancellationToken cancellationToken);

	Task UpdateClassificationAsync(Teacher teacher, CancellationToken cancellationToken);
}