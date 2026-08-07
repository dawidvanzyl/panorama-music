using PanoramaMusic.Teachers.Application.Models;
using PanoramaMusic.Teachers.Domain.Interfaces;

namespace PanoramaMusic.Teachers.Application.Handlers.Teachers;

public sealed class GetLinkableAccountsHandler(
	ITeacherRepository teacherRepository,
	IAccountDirectory accountDirectory)
{
	/// <summary>
	/// Returns only the accounts holding the Teacher role that are not already
	/// linked. Eligibility is resolved here rather than left to the caller,
	/// because it is a correctness constraint on what may be linked, not a
	/// presentation choice about what to show.
	/// <para>
	/// It composes two contexts' facts: Identity supplies the accounts holding
	/// the role, and Teachers subtracts the ones it has already claimed. Neither
	/// queries the other's tables to do it.
	/// </para>
	/// </summary>
	public async Task<IList<LinkableAccountResult>> HandleAsync(CancellationToken cancellationToken)
	{
		var accounts = await accountDirectory.GetTeacherRoleAccountsAsync(cancellationToken);
		var linkedAccountIds = (await teacherRepository.GetLinkedAccountIdsAsync(cancellationToken)).ToHashSet();

		return
		[
			.. accounts
				.Where(account => !linkedAccountIds.Contains(account.AccountId))
				.Select(account => new LinkableAccountResult(account.AccountId, account.Email))
		];
	}
}