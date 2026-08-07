using PanoramaMusic.Teachers.Domain.Entities;
using PanoramaMusic.Teachers.Domain.Exceptions;
using PanoramaMusic.Teachers.Domain.Interfaces;
using PanoramaMusic.Teachers.Domain.Messages;

namespace PanoramaMusic.Teachers.Domain.Services;

/// <summary>
/// Owns the eligibility rules for attaching a login account to a teacher. They
/// live here rather than on <see cref="Teacher"/> because they are decided
/// against state the teacher cannot see — the account's roles, which Identity
/// answers for, and whether another teacher already claims it, which Teachers
/// answers for itself.
/// </summary>
public sealed class TeacherAccountLinkService(
	ITeacherRepository teacherRepository,
	IAccountDirectory accountDirectory)
{
	public async Task LinkAsync(Teacher teacher, Guid accountId, CancellationToken cancellationToken)
	{
		var account = await accountDirectory.GetAccountAsync(accountId, cancellationToken)
			?? throw new DomainException(TeacherAccountLinkMessages.AccountDoesNotExist);

		if (!account.HasTeacherRole)
			throw new DomainException(TeacherAccountLinkMessages.AccountWithoutTeacherRole);

		if (await teacherRepository.IsAccountLinkedAsync(accountId, cancellationToken))
			throw new DomainException(TeacherAccountLinkMessages.AccountAlreadyLinked);

		teacher.LinkAccount(accountId);
	}
}