using PanoramaMusic.Teachers.Application.Extensions;
using PanoramaMusic.Teachers.Application.Models;
using PanoramaMusic.Teachers.Domain.Interfaces;

namespace PanoramaMusic.Teachers.Application.Handlers.Teachers;

public sealed class GetLinkableAccountsHandler(ITeacherRepository teacherRepository)
{
	/// <summary>
	/// Returns only the accounts holding the Teacher role that are not already
	/// linked. Eligibility is resolved here rather than left to the caller,
	/// because it is a correctness constraint on what may be linked, not a
	/// presentation choice about what to show.
	/// </summary>
	public async Task<IList<LinkableAccountResult>> HandleAsync(CancellationToken cancellationToken)
	{
		var accounts = await teacherRepository.GetLinkableAccountsAsync(cancellationToken);

		return [.. accounts.Select(account => account.ToResult())];
	}
}