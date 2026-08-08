namespace PanoramaMusic.Teachers.Domain.Messages;

/// <summary>
/// The refusals the banking rules produce. Every message here is safe to return
/// to a caller and safe to log: none of them interpolates an account number, in
/// plaintext or protected form. The application logs structured output to
/// standard output in deployed environments, so a value in an exception message
/// is as exposed as one in the database.
/// </summary>
public static class BankingDetailMessages
{
	public const string AccountNumberRequired = "An account number is required.";
	public const string AccountNumberDigitsOnly = "An account number must contain digits only.";
	public const string AccountNumberLength = "Enter an account number of 6 to 12 digits.";
	public const string BranchCodeLength = "Branch code must be 6 digits.";
	public const string BankingDetailsAlreadyCaptured = "This teacher already has banking details captured. Edit them instead.";
	public const string BankingDetailsNotCaptured = "This teacher has no banking details captured.";
}