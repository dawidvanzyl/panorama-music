using PanoramaMusic.Students.Application.Interfaces;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Services;

/// <summary>
/// Answers "may this caller change this guardian's own details?" and nothing
/// else. Every guardian write asks here, so the rule that a coordinator
/// maintains waiting-list data but never rewrites what an enrolled student
/// depends on is stated once rather than restated by each handler.
/// <para>
/// A guardian is a single row shared across a sibling group, so an edit or a
/// delete reaches every student linked to it. Linking and unlinking touch only
/// one student's association and are therefore never restricted, and neither is
/// reading: a caller sees every guardian, restricted ones included.
/// </para>
/// <para>
/// Which record is being written decides this, not which route was called, so
/// it cannot be an endpoint authorization policy the way the role checks are.
/// A caller holding Teacher is unrestricted throughout — they maintain the
/// roster those enrolled students belong to.
/// </para>
/// </summary>
public sealed class GuardianMaintenanceScope(
	IUserContext userContext,
	IStudentGuardianRepository studentGuardianRepository)
{
	/// <summary>Whether the restriction applies to this caller at all.</summary>
	public bool AppliesToCaller => !userContext.IsTeacher;

	/// <summary>
	/// Throws when this caller may not change the guardian's own details.
	/// </summary>
	public async Task EnsureMaintainableAsync(Guardian guardian, CancellationToken cancellationToken)
	{
		if (!AppliesToCaller)
			return;

		if (await studentGuardianRepository.HasEnrolledLinkAsync(guardian.GuardianId, cancellationToken))
			throw new ForbiddenException(
				$"{guardian.FirstName} {guardian.Surname} is shared with an enrolled student and cannot be maintained here.");
	}

	/// <summary>
	/// The subset of the guardians reachable from this student that this caller
	/// may not change — empty for a caller the restriction does not apply to.
	/// Resolved in one query so a list can be flagged without a lookup per row.
	/// </summary>
	public async Task<IReadOnlySet<Guid>> RestrictedGuardianIdsAsync(Guid studentId, CancellationToken cancellationToken)
	{
		if (!AppliesToCaller)
			return new HashSet<Guid>();

		var guardianIds = await studentGuardianRepository.GetEnrolledLinkedGuardianIdsAsync(studentId, cancellationToken);

		return guardianIds.ToHashSet();
	}
}
