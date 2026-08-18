using PanoramaMusic.Students.Domain.ValueObjects;

namespace PanoramaMusic.Students.Domain.Interfaces;

/// <summary>
/// What the Students context needs to know about teachers, declared by the
/// context that consumes it and implemented by the one that owns the data — the
/// same shape as the Teachers context's own <c>IAccountDirectory</c>, which
/// Identity implements.
/// </summary>
public interface ITeacherDirectory
{
	/// <summary>Returns null when no such teacher exists.</summary>
	Task<DirectoryTeacher?> GetTeacherAsync(Guid teacherId, CancellationToken cancellationToken);

	/// <summary>
	/// The given teachers, keyed by id and resolved in one pass so naming the
	/// teacher on every enrollment of a roster costs no lookup per row.
	/// </summary>
	Task<IReadOnlyDictionary<Guid, DirectoryTeacher>> GetTeachersAsync(
		IReadOnlyCollection<Guid> teacherIds,
		CancellationToken cancellationToken);
}