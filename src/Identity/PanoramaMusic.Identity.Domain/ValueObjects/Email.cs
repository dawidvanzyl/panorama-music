using PanoramaMusic.Identity.Domain.Exceptions;

namespace PanoramaMusic.Identity.Domain.ValueObjects;

public record Email
{
	public string Value { get; }

	private Email(string value) => Value = value;

	public static Email Create(string? email)
	{
		if (string.IsNullOrWhiteSpace(email))
			throw new DomainException("Email cannot be empty.");

		var trimmed = email.Trim();

		return !trimmed.Contains('@')
			? throw new DomainException("Email must contain '@'.")
			: new Email(trimmed.ToLowerInvariant());
	}

	public override string ToString() => Value;
}