using PanoramaMusic.Identity.Domain.Exceptions;

namespace PanoramaMusic.Identity.Domain.ValueObjects;

public record PasswordHash
{
	public string Value { get; }

	private PasswordHash(string value) => Value = value;

	public static PasswordHash Create(string? hash)
	{
		return string.IsNullOrWhiteSpace(hash)
			? throw new DomainException("Password hash cannot be empty.")
			: new PasswordHash(hash);
	}

	public override string ToString() => Value;
}