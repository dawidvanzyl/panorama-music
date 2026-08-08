using PanoramaMusic.Domain;

namespace PanoramaMusic.Teachers.Domain.Events.Banking;

/// <summary>
/// A teacher's banking details were deleted. The last four digits are what
/// remains identifiable about the removed record — see
/// <see cref="BankingDetailsCaptured"/> for why nothing more travels.
/// </summary>
public sealed record BankingDetailsDeleted(Guid TeacherId, string AccountNumberLast4) : IDomainEvent;