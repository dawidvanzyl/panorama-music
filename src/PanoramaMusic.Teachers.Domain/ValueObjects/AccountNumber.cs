using PanoramaMusic.Teachers.Domain.Exceptions;
using PanoramaMusic.Teachers.Domain.Messages;

namespace PanoramaMusic.Teachers.Domain.ValueObjects;

/// <summary>
/// A bank account number in the clear. Constructed only on the write path and
/// on reveal — a set of banking details loaded for display never holds one.
/// <para>
/// <see cref="ToString"/> is overridden to the masked form on purpose. This type
/// is the one place a plaintext account number exists in memory, and structured
/// logging, exception messages and debugger output all reach for
/// <c>ToString()</c>. Reading the value has to be a deliberate act, so it is
/// <see cref="Value"/> and nothing else. The override is what makes this type
/// safe to hold as a record: without it the compiler-generated
/// <c>ToString()</c> would print the number.
/// </para>
/// </summary>
public sealed record AccountNumber
{
	private const int _minimumLength = 6;
	private const int _maximumLength = 12;
	private const int _last4Length = 4;

	private AccountNumber(string value)
	{
		Value = value;
	}

	public string Value { get; }

	public string Last4 => Value[^_last4Length..];

	public static AccountNumber Create(string? value)
	{
		if (string.IsNullOrWhiteSpace(value))
			throw new DomainException(BankingDetailMessages.AccountNumberRequired);

		var trimmed = value.Trim();

		if (!trimmed.All(char.IsAsciiDigit))
			throw new DomainException(BankingDetailMessages.AccountNumberDigitsOnly);

		var withinLength = trimmed.Length is >= _minimumLength and <= _maximumLength;

		return !withinLength
			? throw new DomainException(BankingDetailMessages.AccountNumberLength)
			: new AccountNumber(trimmed);
	}

	/// <summary>
	/// The masked form — never the number itself. See the type remarks.
	/// </summary>
	public override string ToString() => $"•••• •••• {Last4}";
}