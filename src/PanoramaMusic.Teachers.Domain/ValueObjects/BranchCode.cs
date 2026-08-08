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

	/// <summary>
	/// Rehydrates an already-stored value without re-running the invariant, the
	/// same way <see cref="Entities.BankingDetails.Restore"/> does. Re-validating
	/// on read turns one bad stored row into a failure of every read that
	/// happens to include it — a roster of a hundred teachers would fail whole
	/// because of one. Validation belongs on the way in; a value that is already
	/// in the database is a fact, whether or not it still satisfies the rule.
	/// </summary>
	public static BranchCode Restore(string value) => new(value);

	public static BranchCode Create(string? value)
	{
		var trimmed = value?.Replace(" ", string.Empty) ?? string.Empty;

		return trimmed.Length != _length || !trimmed.All(char.IsAsciiDigit)
			? throw new DomainException(BankingDetailMessages.BranchCodeLength)
			: new BranchCode(trimmed);
	}

	public override string ToString() => Value;
}