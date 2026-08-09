using PanoramaMusic.Teachers.Application.Models;
using PanoramaMusic.Teachers.Domain.Entities;
using PanoramaMusic.Teachers.Domain.ValueObjects;

namespace PanoramaMusic.Teachers.Application.Extensions;

public static class BankingDetailsExtensions
{
	/// <summary>
	/// Projects the masked shape. The aggregate's <c>AccountNumber</c> is
	/// deliberately not read here — even on the write path, where it is
	/// populated, it must not travel back to the caller.
	/// </summary>
	public static BankingDetailsResult ToResult(this BankingDetails bankingDetails) =>
		new(
			bankingDetails.Bank,
			bankingDetails.AccountType,
			bankingDetails.BranchCode.Value,
			bankingDetails.AccountNumberLast4);

	public static BankingActivityEntryResult ToResult(this BankingActivityEntry entry) =>
		new(
			entry.OccurredAt,
			entry.EventType,
			entry.ActorEmail,
			entry.AccountNumberLast4);
}