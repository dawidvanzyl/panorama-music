using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.ValueObjects;

namespace PanoramaMusic.Students.Domain.Interfaces;

public interface IStudentRepository
{
	Task<Student?> GetByIdAsync(Guid studentId, CancellationToken cancellationToken);

	/// <summary>
	/// The student roster. A student whose only state is a waiting-list entry is
	/// excluded, which is what keeps the two listings mutually exclusive.
	/// </summary>
	Task<IList<Student>> GetAllAsync(CancellationToken cancellationToken);

	/// <summary>
	/// Every student who may be linked as a sibling, each carrying the listing
	/// they belong to. Unlike <see cref="GetAllAsync"/> this spans both
	/// populations: a sibling relationship is a family fact and does not depend
	/// on either child's enrolment. Filtering out the student in hand and the
	/// siblings they already hold is the caller's concern — no student is named
	/// here.
	/// </summary>
	Task<IList<SiblingCandidate>> GetSiblingCandidatesAsync(CancellationToken cancellationToken);

	Task CreateAsync(Student student, CancellationToken cancellationToken);

	Task UpdateAsync(Student student, CancellationToken cancellationToken);

	Task DeleteAsync(Student student, CancellationToken cancellationToken);
}