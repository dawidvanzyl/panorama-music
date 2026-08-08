using PanoramaMusic.Domain;

namespace PanoramaMusic.Teachers.Domain.Events.Banking;

/// <summary>
/// A teacher's banking details were changed.
/// <para>
/// The flags name which fields moved without carrying what they moved from or
/// to. That is the whole point: an audit reader needs to know a branch code was
/// changed — enough to ask the right question of the right person — but the
/// values themselves would outlive the banking record in a table that is never
/// deleted. A before/after diff is the specific shape this mistake takes, so
/// these are booleans and can only ever be booleans.
/// </para>
/// <para>
/// <paramref name="AccountNumberChanged"/> means a new number was submitted,
/// not that it differs from the stored one. Proving it differs would mean
/// unprotecting the stored value on every edit, and reading that value is
/// exactly the deliberate, separately audited act the reveal action exists to
/// be. Resubmitting an identical number therefore reads as a change.
/// </para>
/// </summary>
public sealed record BankingDetailsAmended(
	Guid TeacherId,
	string AccountNumberLast4,
	bool BankChanged,
	bool AccountTypeChanged,
	bool BranchCodeChanged,
	bool AccountNumberChanged) : IDomainEvent;