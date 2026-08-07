using PanoramaMusic.Teachers.Domain.Entities;
using PanoramaMusic.Teachers.Domain.Exceptions;
using PanoramaMusic.Teachers.Domain.Interfaces;

namespace PanoramaMusic.Teachers.Domain.Services;

/// <summary>
/// Owns the eligibility rules for attaching a login account to a teacher. They
/// live here rather than on <see cref="Teacher"/> because they are decided
/// against state the teacher cannot see — the account's roles, and whether
/// another teacher already claims it.
/// </summary>
public sealed class TeacherAccountLinkService(ITeacherRepository teacherRepository)
{
	public async Task LinkAsync(Teacher teacher, Guid accountId, CancellationToken cancellationToken)
	{
		var accountState = await teacherRepository.GetAccountLinkStateAsync(accountId, cancellationToken)
			?? throw new DomainException("The selected login account does not exist.");

		if (!accountState.HasTeacherRole)
			throw new DomainException("Only accounts holding the Teacher role can be linked to a teacher.");

		if (accountState.IsLinked)
			throw new DomainException("That login account is already linked to a teacher.");

		teacher.LinkAccount(accountId, accountState.Email);
	}
}