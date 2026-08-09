using PanoramaMusic.Teachers.Domain.Entities;

namespace PanoramaMusic.Teachers.Domain.Interfaces;

public interface ITeacherRepository
{
	Task<Teacher?> GetByIdAsync(Guid teacherId, CancellationToken cancellationToken);

	Task<IList<Teacher>> GetAllAsync(CancellationToken cancellationToken);

	Task CreateAsync(Teacher teacher, CancellationToken cancellationToken);

	Task UpdateProfileAsync(Teacher teacher, CancellationToken cancellationToken);

	Task UpdateClassificationAsync(Teacher teacher, CancellationToken cancellationToken);

	/// <summary>Whether some teacher already claims this login account.</summary>
	Task<bool> IsAccountLinkedAsync(Guid accountId, CancellationToken cancellationToken);

	/// <summary>
	/// Every account id currently claimed by a teacher — what an eligible-account
	/// set is filtered against.
	/// </summary>
	Task<IList<Guid>> GetLinkedAccountIdsAsync(CancellationToken cancellationToken);

	Task LinkAccountAsync(Teacher teacher, CancellationToken cancellationToken);

	Task UnlinkAccountAsync(Teacher teacher, CancellationToken cancellationToken);

	Task DeactivateAsync(Teacher teacher, CancellationToken cancellationToken);

	Task ReactivateAsync(Teacher teacher, CancellationToken cancellationToken);

	/// <summary>Permanently removes the teacher row and everything keyed to it.</summary>
	Task DeleteAsync(Teacher teacher, CancellationToken cancellationToken);
}