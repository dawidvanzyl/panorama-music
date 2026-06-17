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

	public static RawToken Generate()
	{
		var bytes = RandomNumberGenerator.GetBytes(32);
		return new(Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_'));
	}

	public static RawToken From(string value) => new(value);

	private static string ComputeHash(string value)
	{
		var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(value));
		return Convert.ToHexStringLower(bytes);
	}
}