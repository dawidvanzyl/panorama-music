using PanoramaMusic.Teachers.Domain.Entities;
using PanoramaMusic.Teachers.Domain.ValueObjects;

namespace PanoramaMusic.Teachers.Domain.Interfaces;

/// <summary>
/// Persistence for a teacher's banking details. Protecting and unprotecting the
/// account number happen behind this contract, in the persistence layer — never
/// in a handler or a route — so no caller ever holds a protected payload or
/// decides when one is turned back into a number.
/// </summary>
public interface IBankingDetailsRepository
{
	/// <summary>
	/// The stored record in masked form, or null when none has been captured.
	/// The returned aggregate never carries the account number.
	/// </summary>
	Task<BankingDetails?> GetByTeacherIdAsync(Guid teacherId, CancellationToken cancellationToken);

	/// <summary>
	/// Every captured set, masked, in one call — what composing a roster's
	/// banking column reads, instead of a lookup per teacher.
	/// </summary>
	Task<IList<BankingDetails>> GetAllAsync(CancellationToken cancellationToken);

	Task CreateAsync(BankingDetails bankingDetails, CancellationToken cancellationToken);

	Task UpdateAsync(BankingDetails bankingDetails, CancellationToken cancellationToken);

	Task DeleteAsync(BankingDetails bankingDetails, CancellationToken cancellationToken);

	/// <summary>
	/// Unprotects and returns the stored account number, or null when the teacher
	/// has no banking details. The only path by which the full value leaves
	/// persistence.
	/// </summary>
	Task<AccountNumber?> RevealAccountNumberAsync(BankingDetails bankingDetails, CancellationToken cancellationToken);
}