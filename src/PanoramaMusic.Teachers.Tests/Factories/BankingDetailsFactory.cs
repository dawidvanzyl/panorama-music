using PanoramaMusic.Teachers.Domain.Entities;
using PanoramaMusic.Teachers.Domain.Enums;
using PanoramaMusic.Teachers.Domain.ValueObjects;

namespace PanoramaMusic.Teachers.Tests.Factories;

public static class BankingDetailsFactory
{
	public const string AccountNumberValue = "1234567890";

	/// <summary>
	/// A freshly captured set, carrying the account number and a pending
	/// captured event — the shape the write path produces.
	/// </summary>
	public static BankingDetails Capture(
		Guid teacherId,
		Bank bank = Bank.StandardBank,
		BankAccountType accountType = BankAccountType.Savings,
		string branchCode = "051001",
		string accountNumber = AccountNumberValue) =>
		BankingDetails.Capture(
			teacherId,
			bank,
			accountType,
			BranchCode.Create(branchCode),
			AccountNumber.Create(accountNumber));

	/// <summary>
	/// A set as it comes back out of storage: masked, with no account number and
	/// no pending events.
	/// </summary>
	public static BankingDetails Restore(
		Guid teacherId,
		Bank bank = Bank.StandardBank,
		BankAccountType accountType = BankAccountType.Savings,
		string branchCode = "051001",
		string accountNumberLast4 = "7890") =>
		BankingDetails.Restore(
			teacherId,
			bank,
			accountType,
			BranchCode.Create(branchCode),
			accountNumberLast4);
}