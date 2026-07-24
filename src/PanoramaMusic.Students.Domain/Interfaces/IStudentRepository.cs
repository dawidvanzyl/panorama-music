using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Domain.Interfaces;

public interface IStudentRepository
{
	Task<Student?> GetByIdAsync(Guid studentId, CancellationToken cancellationToken);

	Task<IList<Student>> GetAllAsync(CancellationToken cancellationToken);

	Task CreateAsync(Student student, CancellationToken cancellationToken);

	Task UpdateAsync(Student student, CancellationToken cancellationToken);

	Task DeleteAsync(Student student, CancellationToken cancellationToken);
}