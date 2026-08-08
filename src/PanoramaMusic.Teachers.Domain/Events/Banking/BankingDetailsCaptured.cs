using PanoramaMusic.Domain;

namespace PanoramaMusic.Teachers.Domain.Events.Banking;

/// <summary>
/// Banking details were captured for a teacher for the first time.
/// <para>
/// The event carries the teacher and the last four digits, and nothing else.
/// Audit entries outlive the banking record — it is deleted when the teacher is
/// deactivated — so anything this event carries survives the retention boundary
/// the milestone deliberately sets. That is why the account number never
/// appears here, in plaintext or protected form.
/// </para>
/// </summary>
public sealed record BankingDetailsCaptured(Guid TeacherId, string AccountNumberLast4) : IDomainEvent;