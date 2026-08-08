namespace PanoramaMusic.Persistence.Tests.Models;

/// <summary>
/// Every column of teachers.banking_details as stored, read straight off the
/// table rather than through the repository — the point of the tests that use
/// it is to see what is actually on disk, not what the mapping chooses to show.
/// </summary>
public sealed record TestBankingDetailsRow(
	Guid TeacherId,
	string Bank,
	string AccountType,
	string BranchCode,
	string AccountNumberProtected,
	string AccountNumberLast4)
{
	/// <summary>Every stored value concatenated, for "does any column contain this?" assertions.</summary>
	public string AllColumns => string.Join('|', TeacherId, Bank, AccountType, BranchCode, AccountNumberProtected, AccountNumberLast4);
}