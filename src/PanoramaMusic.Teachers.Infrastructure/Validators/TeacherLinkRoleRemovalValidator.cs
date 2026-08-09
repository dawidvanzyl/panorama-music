using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;
using PanoramaMusic.Teachers.Domain.Interfaces;

namespace PanoramaMusic.Teachers.Infrastructure.Validators;

/// <summary>
/// The Teachers context's answer to Identity's <see cref="IRoleRemovalValidator"/>:
/// while an account is linked to a teacher, it keeps the Teacher role. Removing
/// it would strip the permissions the link depends on and leave the two quietly
/// out of step.
/// </summary>
public sealed class TeacherLinkRoleRemovalValidator(ITeacherRepository teacherRepository) : IRoleRemovalValidator
{
	public async Task<ValidationResult> ValidateRemoveAsync(Guid userId, Role role, CancellationToken cancellationToken)
	{
		if (role != Role.Teacher)
			return ValidationResult.Success();

		var isLinked = await teacherRepository.IsAccountLinkedAsync(userId, cancellationToken);

		return isLinked
			? ValidationResult.Failure("This account is linked to a teacher. Unlink the teacher first, then remove the Teacher role.")
			: ValidationResult.Success();
	}
}