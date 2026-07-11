using System.Reflection;

namespace PanoramaMusic.Identity.Infrastructure.Services;

/// <summary>
/// Validates submitted passwords against an embedded top-10,000 common/breached-password
/// list (ASVS 5.0.0-6.2.4). Built once per process since the list is static, compiled-in data.
/// </summary>
public sealed class DenyListPasswordService : IDenyListPasswordService
{
	private const string _resourceName = "PanoramaMusic.Identity.Infrastructure.Resources.CommonPasswords.txt";

	private static readonly Lazy<HashSet<string>> _commonPasswords = new(LoadCommonPasswords);

	public bool Validate(string password) => !_commonPasswords.Value.Contains(password);

	private static HashSet<string> LoadCommonPasswords()
	{
		var assembly = Assembly.GetExecutingAssembly();
		using var stream = assembly.GetManifestResourceStream(_resourceName)
			?? throw new InvalidOperationException($"Embedded resource '{_resourceName}' was not found.");
		using var reader = new StreamReader(stream);

		var commonPasswords = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
		while (reader.ReadLine() is { } line)
		{
			if (!string.IsNullOrWhiteSpace(line))
				commonPasswords.Add(line.Trim());
		}

		return commonPasswords;
	}
}