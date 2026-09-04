using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Services;

/// <summary>
/// Answers "which surface is this write coming through?" for the handlers
/// behind the wizard tabs the roster and the waiting list share. Those tabs
/// call one set of endpoints in both modes, so unlike a student's own record —
/// where the roster and the waiting list have separate routes and their
/// handlers simply state which they are — there is no route to read it off.
/// <para>
/// The record decides it instead: a student the roster cannot show is one only
/// the waiting list could have reached. That is the same narrower set the
/// waiting-list write paths resolve — holds an entry and holds no course
/// enrollment — so a student carrying a stale entry alongside an enrollment
/// still counts as the roster's, matching where the roster shows them.
/// </para>
/// <para>
/// This is deliberately not taken from the request. A caller could then name
/// whichever surface suited them, and a provenance field a caller chooses is
/// worth nothing on the record that exists to hold callers to account.
/// </para>
/// </summary>
public sealed class StudentWriteSourceResolver(
	IWaitingListRepository waitingListRepository,
	IStudentGuardianRepository studentGuardianRepository)
{
	/// <summary>
	/// For a write made against one student — their siblings and their guardian
	/// links are maintained through that student, so they carry its source too.
	/// </summary>
	public async Task<StudentWriteSource> ForStudentAsync(Guid studentId, CancellationToken cancellationToken)
	{
		var entry = await waitingListRepository.GetByStudentIdAsync(studentId, cancellationToken);

		return entry is null ? StudentWriteSource.Roster : StudentWriteSource.WaitingList;
	}

	/// <summary>
	/// For a write made against a guardian named by its own id, with no student
	/// in scope. A guardian is one row shared across a sibling group, so it is
	/// the waiting list's only while every student holding it is.
	/// </summary>
	public async Task<StudentWriteSource> ForGuardianAsync(Guid guardianId, CancellationToken cancellationToken)
	{
		var waitingListOnly = await studentGuardianRepository.BelongsToWaitingListOnlyAsync(guardianId, cancellationToken);

		return waitingListOnly ? StudentWriteSource.WaitingList : StudentWriteSource.Roster;
	}
}