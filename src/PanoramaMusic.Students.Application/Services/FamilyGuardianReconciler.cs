using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Services;

/// <summary>
/// Gives a student's enrolled siblings every guardian that student holds.
/// <para>
/// A guardian added to a waiting-list student is deliberately kept from their
/// enrolled siblings, because the caller who added it may not write to a record
/// an enrolled student depends on. That holds only while the student waits: once
/// they are enrolled the family is wholly enrolled, and a guardian belongs to the
/// family rather than to one child. This closes the gap the wait left behind, and
/// it is the only thing it does — the restriction on maintaining a guardian's own
/// details is untouched, and never governed linking in the first place.
/// </para>
/// <para>
/// Only enrolled siblings are considered. A sibling still on the waiting list
/// received the guardian when it was added, so there is nothing to repair for
/// them.
/// </para>
/// </summary>
public sealed class FamilyGuardianReconciler(
	ISiblingRepository siblingRepository,
	IStudentGuardianRepository studentGuardianRepository)
{
	/// <summary>
	/// Creates the links this student's enrolled siblings are missing. Nothing is
	/// written where the family already agrees, and no guardian's own details are
	/// touched — only links are created.
	/// </summary>
	public async Task ReconcileEnrolledSiblingsAsync(
		Student student,
		StudentWriteSource source,
		CancellationToken cancellationToken)
	{
		var missingLinks = await studentGuardianRepository.GetMissingEnrolledSiblingLinksAsync(
			student.StudentId, cancellationToken);
		if (missingLinks.Count == 0)
			return;

		// A link carries the student and the guardian rather than their ids, so
		// both are loaded once for the whole set. Each missing link names a sibling
		// of this student and a guardian this student holds, which is exactly what
		// these two reads return.
		var siblings = (await siblingRepository.GetSiblingsAsync(student.StudentId, cancellationToken))
			.ToDictionary(sibling => sibling.StudentId);
		var guardians = (await studentGuardianRepository.GetGuardiansByStudentIdAsync(student.StudentId, cancellationToken))
			.ToDictionary(guardian => guardian.GuardianId);

		foreach (var missingLink in missingLinks)
		{
			var link = StudentGuardian.Create(
				siblings[missingLink.StudentId],
				guardians[missingLink.GuardianId],
				source);
			await studentGuardianRepository.CreateAsync(link, cancellationToken);
		}
	}
}