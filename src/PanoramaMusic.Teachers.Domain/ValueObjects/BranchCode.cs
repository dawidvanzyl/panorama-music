using PanoramaMusic.Teachers.Domain.Exceptions;
using PanoramaMusic.Teachers.Domain.Messages;

namespace PanoramaMusic.Teachers.Domain.ValueObjects;

/// <summary>
/// A South African bank branch code — always six digits. Not sensitive on its
/// own, so unlike <see cref="AccountNumber"/> it is stored and displayed in the
/// clear.
/// </summary>
public sealed record BranchCode
{
	private const int _length = 6;

	private BranchCode(string value)
	{
		Value = value;
	}

	public string Value { get; }

	public static BranchCode Create(string? value)
	{
		var trimmed = value?.Replace(" ", string.Empty) ?? string.Empty;

		return trimmed.Length != _length || !trimmed.All(char.IsAsciiDigit)
			? throw new DomainException(BankingDetailMessages.BranchCodeLength)
			: new BranchCode(trimmed);
	}

	public override string ToString() => Value;
}