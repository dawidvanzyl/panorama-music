using System.Security.Cryptography;
using System.Text;

namespace PanoramaMusic.Identity.Domain.ValueObjects;

public sealed class RawToken
{
	public string Value { get; }
	public string Hash { get; }

	private RawToken(string value)
	{
		Value = value;
		Hash = ComputeHash(value);
	}

	public static RawToken Generate() => new(Guid.NewGuid().ToString());

	public static RawToken From(string value) => new(value);

	private static string ComputeHash(string value)
	{
		var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(value));
		return Convert.ToHexStringLower(bytes);
	}
}