using PanoramaMusic.Domain;

namespace PanoramaMusic.Teachers.Domain.Events.Banking;

/// <summary>
/// The full account number was unprotected and handed to a caller. The one
/// event that records a read, because revealing is the one read that exposes
/// the value the rest of this design exists to protect — and, like every other
/// banking event, it carries only the last four digits.
/// </summary>
public sealed record BankingDetailsRevealed(Guid TeacherId, string AccountNumberLast4) : IDomainEvent;