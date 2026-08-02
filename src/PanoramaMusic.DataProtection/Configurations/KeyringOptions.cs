using PanoramaMusic.DataProtection.Enums;

namespace PanoramaMusic.DataProtection.Configurations;

public sealed class KeyringOptions
{
	public const string SectionName = "DataProtection";

	public KeyProtectionMode KeyProtection { get; set; } = KeyProtectionMode.None;
	public string? CertificateBase64 { get; set; }
	public string? CertificatePassword { get; set; }
	public string ApplicationName { get; set; } = string.Empty;
}