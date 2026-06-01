using PanoramaMusic.Identity.Domain.Common;

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

        if (!trimmed.Contains('@'))
            throw new DomainException("Email must contain '@'.");

        return new Email(trimmed.ToLowerInvariant());
    }

    public override string ToString() => Value;
}
