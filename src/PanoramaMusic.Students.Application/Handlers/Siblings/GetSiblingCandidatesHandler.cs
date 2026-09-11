using PanoramaMusic.Students.Application.Extensions;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers.Siblings;

/// <summary>
/// The students the wizard's Siblings tab may offer, spanning the roster and the
/// waiting list alike. Kept apart from <c>GetStudentsHandler</c> deliberately:
/// the roster read's narrower population is what keeps the two listings mutually
/// exclusive, and sibling candidacy has no business narrowing with it.
/// </summary>
public sealed class GetSiblingCandidatesHandler(IStudentRepository studentRepository)
{
	public async Task<IList<SiblingCandidateResult>> HandleAsync(CancellationToken cancellationToken)
	{
		var candidates = await studentRepository.GetSiblingCandidatesAsync(cancellationToken);

		return [.. candidates.Select(candidate => candidate.ToResult())];
	}
}
