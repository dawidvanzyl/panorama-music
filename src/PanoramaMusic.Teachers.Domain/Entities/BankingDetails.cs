using PanoramaMusic.Domain;
using PanoramaMusic.Teachers.Domain.Enums;
using PanoramaMusic.Teachers.Domain.Events.Banking;
using PanoramaMusic.Teachers.Domain.ValueObjects;

namespace PanoramaMusic.Teachers.Domain.Entities;

/// <summary>
/// A teacher's banking information. Its own aggregate rather than state hanging
/// off <see cref="Teacher"/>: it has its own table, its own lifecycle (it is
/// deleted when the teacher is deactivated, while the teacher survives) and its
/// own authorization rules, and a teacher is a complete record without one.
/// <para>
/// The identity of the aggregate is the teacher it belongs to, which is what
/// makes "at most one set per teacher" a property of the model rather than a
/// rule someone has to remember to check.
/// </para>
/// </summary>
public sealed class BankingDetails : AggregateRoot
{
	private BankingDetails(
		Guid teacherId,
		Bank bank,
		BankAccountType accountType,
		BranchCode branchCode,
		string accountNumberLast4,
		AccountNumber? accountNumber)
	{
		TeacherId = teacherId;
		Bank = bank;
		AccountType = accountType;
		BranchCode = branchCode;
		AccountNumberLast4 = accountNumberLast4;
		AccountNumber = accountNumber;
	}

	public Guid TeacherId { get; }

	public Bank Bank { get; private set; }

	public BankAccountType AccountType { get; private set; }

	public BranchCode BranchCode { get; private set; }

	/// <summary>
	/// The only part of the account number held in the clear. Always present,
	/// including on a record loaded for display, so masking never costs an
	/// unprotect.
	/// </summary>
	public string AccountNumberLast4 { get; private set; }

	/// <summary>
	/// The account number in the clear, and only while it is being written:
	/// non-null on a record just created or just given a new number, null on a
	/// record loaded from storage and null after an edit that kept the stored
	/// number. Persistence protects this value; nothing else may read it.
	/// </summary>
	public AccountNumber? AccountNumber { get; private set; }

	/// <summary>
	/// Rehydrates a stored record. No event — loading is not something that
	/// happened to the teacher's banking details.
	/// </summary>
	public static BankingDetails Restore(
		Guid teacherId,
		Bank bank,
		BankAccountType accountType,
		BranchCode branchCode,
		string accountNumberLast4) =>
		new(teacherId, bank, accountType, branchCode, accountNumberLast4, accountNumber: null);

	public static BankingDetails Capture(
		Guid teacherId,
		Bank bank,
		BankAccountType accountType,
		BranchCode branchCode,
		AccountNumber accountNumber)
	{
		var details = new BankingDetails(
			teacherId,
			bank,
			accountType,
			branchCode,
			accountNumber.Last4,
			accountNumber);

		details.Raise(new BankingDetailsCaptured(teacherId, accountNumber.Last4));
		return details;
	}

	/// <summary>
	/// Applies an edit. <paramref name="accountNumber"/> is null when the editor
	/// left the number alone — the stored one cannot be read back into the form,
	/// so "unchanged" is expressed by its absence rather than by resubmitting it.
	/// <para>
	/// The comparison happens here, before the new values are applied, because
	/// this is the last moment both pictures exist — and it yields only flags.
	/// The event records which fields changed and the last four digits, never
	/// what any field changed from or to. A before/after diff is the specific
	/// shape this mistake takes, and for banking fields it would put account
	/// numbers into a table that outlives the record itself.
	/// </para>
	/// </summary>
	public void Amend(
		Bank bank,
		BankAccountType accountType,
		BranchCode branchCode,
		AccountNumber? accountNumber)
	{
		var bankChanged = Bank != bank;
		var accountTypeChanged = AccountType != accountType;
		var branchCodeChanged = BranchCode != branchCode;

		Bank = bank;
		AccountType = accountType;
		BranchCode = branchCode;
		AccountNumber = accountNumber;

		if (accountNumber is not null)
			AccountNumberLast4 = accountNumber.Last4;

		Raise(new BankingDetailsAmended(
			TeacherId,
			AccountNumberLast4,
			bankChanged,
			accountTypeChanged,
			branchCodeChanged,
			// A submitted number counts as a change; see the event's remarks for
			// why it is not compared against the stored one.
			AccountNumberChanged: accountNumber is not null));
	}

	public void Delete()
	{
		Raise(new BankingDetailsDeleted(TeacherId, AccountNumberLast4));
	}

	/// <summary>
	/// Records that the full number was handed to a caller. Raised by the reveal
	/// action alone — revealing is a deliberate, audited act, not a property of
	/// reading the record — and carries only the last four digits, the same as
	/// every other banking event.
	/// </summary>
	public void Reveal()
	{
		Raise(new BankingDetailsRevealed(TeacherId, AccountNumberLast4));
	}
}