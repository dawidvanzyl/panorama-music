using System.Security.Cryptography;
using System.Text;

namespace PanoramaMusic.Identity.Domain.ValueObjects;

public sealed class RawInviteToken
{
	public string Value { get; }
	public string Hash { get; }
	public string Url { get; }

	private RawInviteToken(string value)
	{
		Value = value;
		Hash = ComputeHash(value);
		Url = $"/#/register?token={value}";
	}

	public static RawInviteToken Generate() => new(Guid.NewGuid().ToString());

	private static string ComputeHash(string value)
	{
		var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(value));
		return Convert.ToHexStringLower(bytes);
	}
}