namespace PanoramaMusic.Teachers.Application.Models;

/// <summary>
/// The only result type in the context that carries a full account number, and
/// the only one returned by the reveal endpoint. Keeping it separate from
/// <see cref="BankingDetailsResult"/> is what makes "the full value is returned
/// by exactly one action" visible in the type system rather than a rule about
/// which field to leave unset.
/// </summary>
public sealed record RevealedAccountNumberResult(string AccountNumber);