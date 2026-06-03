using Konscious.Security.Cryptography;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;

namespace PanoramaMusic.Identity.Infrastructure.Services;

/// <summary>
/// Argon2id implementation of <see cref="IPasswordHasher"/>.
/// Stored format: Base64(16-byte salt) + "." + Base64(32-byte hash).
/// </summary>
public class Argon2PasswordHasher : IPasswordHasher
{
	private const int _saltLength = 16;
	private const int _hashLength = 32;
	private const int _degreeOfParallelism = 1;
	private const int _memorySize = 19456;
	private const int _iterations = 2;

	public PasswordHash Hash(string password)
	{
		var salt = new byte[_saltLength];
		System.Security.Cryptography.RandomNumberGenerator.Fill(salt);

		var hash = ComputeHash(password, salt);

		var stored = $"{Convert.ToBase64String(salt)}.{Convert.ToBase64String(hash)}";
		return PasswordHash.Create(stored);
	}

	public bool Verify(string password, PasswordHash hash)
	{
		var parts = hash.Value.Split('.');
		if (parts.Length != 2)
			return false;

		byte[] salt;
		try
		{
			salt = Convert.FromBase64String(parts[0]);
		}
		catch (FormatException)
		{
			return false;
		}

		byte[] storedHash;
		try
		{
			storedHash = Convert.FromBase64String(parts[1]);
		}
		catch (FormatException)
		{
			return false;
		}

		var computedHash = ComputeHash(password, salt);

		return CryptographicEquals(computedHash, storedHash);
	}

	private static byte[] ComputeHash(string password, byte[] salt)
	{
		var passwordBytes = System.Text.Encoding.UTF8.GetBytes(password);

		using var argon2 = new Argon2id(passwordBytes)
		{
			Salt = salt,
			DegreeOfParallelism = _degreeOfParallelism,
			MemorySize = _memorySize,
			Iterations = _iterations,
		};

		return argon2.GetBytes(_hashLength);
	}

	/// <summary>Constant-time byte array comparison to prevent timing attacks.</summary>
	private static bool CryptographicEquals(byte[] a, byte[] b)
	{
		if (a.Length != b.Length)
			return false;

		var diff = 0;
		for (var i = 0; i < a.Length; i++)
		{
			diff |= a[i] ^ b[i];
		}

		return diff == 0;
	}
}