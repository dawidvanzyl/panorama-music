using System.Security.Cryptography;
using System.Text;

namespace PanoramaMusic.Identity.Application;

public static class TokenHasher
{
	public static string ComputeSha256Hash(string value)
	{
		var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(value));
		return Convert.ToHexStringLower(bytes);
	}
}