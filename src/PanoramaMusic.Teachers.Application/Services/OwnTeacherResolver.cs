using PanoramaMusic.Teachers.Application.Interfaces;
using PanoramaMusic.Teachers.Domain.Entities;
using PanoramaMusic.Teachers.Domain.Exceptions;
using PanoramaMusic.Teachers.Domain.Interfaces;
using PanoramaMusic.Teachers.Domain.Messages;

namespace PanoramaMusic.Teachers.Application.Services;

/// <summary>
/// Answers "which teacher is the caller?" and nothing else. Every self-service
/// use case starts here, so the rule that a teacher's identity comes from the
/// signed-in account — never from a value in the request — is enforced in one
/// place rather than restated by each handler.
/// </summary>
public sealed class OwnTeacherResolver(
	IUserContext userContext,
	ITeacherRepository teacherRepository)
{
	public async Task<Teacher> ResolveAsync(CancellationToken cancellationToken)
	{
		var accountId = userContext.UserId
			?? throw new EntityNotFoundException(TeacherSelfServiceMessages.NoLinkedTeacher);

		return await teacherRepository.GetByLinkedAccountIdAsync(accountId, cancellationToken)
			?? throw new EntityNotFoundException(TeacherSelfServiceMessages.NoLinkedTeacher);
	}
}