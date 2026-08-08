using PanoramaMusic.Teachers.Domain.ValueObjects;

namespace PanoramaMusic.Teachers.Domain.Interfaces;

/// <summary>
/// What the Teachers context needs to read back out of the audit trail about
/// one teacher's banking details, declared by the context that consumes it —
/// the same shape as <see cref="IAccountDirectory"/>. Teachers knows which
/// actions it records; how they are stored and queried is someone else's to
/// answer.
/// </summary>
public interface IBankingActivityLog
{
	/// <summary>Newest first.</summary>
	Task<IList<BankingActivityEntry>> GetForTeacherAsync(Guid teacherId, CancellationToken cancellationToken);
}