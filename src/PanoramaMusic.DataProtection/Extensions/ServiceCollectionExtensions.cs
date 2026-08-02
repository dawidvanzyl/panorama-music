using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.DataProtection.KeyManagement;
using Microsoft.AspNetCore.DataProtection.Repositories;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using PanoramaMusic.DataProtection.Configurations;
using PanoramaMusic.DataProtection.Enums;
using PanoramaMusic.DataProtection.Repositories;
using PanoramaMusic.Persistence.Factories;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;

namespace PanoramaMusic.DataProtection.Extensions;

public static class ServiceCollectionExtensions
{
	/// <summary>
	/// Registers a Data Protection provider whose keyring is persisted to PostgreSQL
	/// (rather than the container filesystem, which Render's ephemeral, spin-down-prone
	/// Docker Web Service would silently destroy) and whose protection-at-rest mode is
	/// chosen purely by configuration — a None mode for development/QA and a
	/// Certificate mode for production. Configuration is read directly here (rather than
	/// bound lazily via IOptions) so a missing certificate or password fails startup
	/// immediately instead of on first use, matching the JwtOptions validation pattern in
	/// PanoramaMusic.Identity.Infrastructure.
	/// </summary>
	public static IServiceCollection AddDataProtectionInfrastructure(
		this IServiceCollection services,
		IConfiguration configuration)
	{
		var section = configuration.GetSection(KeyringOptions.SectionName);
		var options = section.Get<KeyringOptions>() ?? new KeyringOptions();

		if (string.IsNullOrWhiteSpace(options.ApplicationName))
			throw new InvalidOperationException($"'{KeyringOptions.SectionName}:{nameof(KeyringOptions.ApplicationName)}' is not configured.");

		// Idempotent (TryAdd-based); called so this extension carries its own logging
		// dependency rather than relying on the host having configured one first.
		services.AddLogging();

		services.AddSingleton<IXmlRepository>(sp =>
			new PostgresXmlRepository(
				sp.GetRequiredService<IDbConnectionFactory>(),
				sp.GetRequiredService<ILogger<PostgresXmlRepository>>()));

		var builder = services.AddDataProtection()
			.SetApplicationName(options.ApplicationName);

		services.AddOptions<KeyManagementOptions>()
			.Configure<IXmlRepository>((keyManagementOptions, xmlRepository) =>
				keyManagementOptions.XmlRepository = xmlRepository);

		if (options.KeyProtection == KeyProtectionMode.Certificate)
		{
			if (string.IsNullOrWhiteSpace(options.CertificateBase64))
				throw new InvalidOperationException($"'{KeyringOptions.SectionName}:{nameof(KeyringOptions.CertificateBase64)}' is not configured.");

			if (string.IsNullOrWhiteSpace(options.CertificatePassword))
				throw new InvalidOperationException($"'{KeyringOptions.SectionName}:{nameof(KeyringOptions.CertificatePassword)}' is not configured.");

			var certificate = LoadProtectionCertificate(options.CertificateBase64, options.CertificatePassword);

			// Registered so the container disposes it at shutdown. The certificate must
			// outlive every protect/unprotect the key ring performs, so it cannot be
			// disposed here — but leaving it unowned would, on Windows, keep the PKCS#12
			// key file in the crypto store until finalization.
			services.AddSingleton(certificate);
			builder.ProtectKeysWithCertificate(certificate);
		}

		return services;
	}

	/// <summary>
	/// Fails with an error naming the offending setting when the certificate is present
	/// but unusable. A malformed blob or a wrong password is the likelier production
	/// failure than an absent one, and the underlying FormatException /
	/// CryptographicException names neither setting.
	/// </summary>
	private static X509Certificate2 LoadProtectionCertificate(string certificateBase64, string certificatePassword)
	{
		byte[] certificateBytes;

		try
		{
			certificateBytes = Convert.FromBase64String(certificateBase64);
		}
		catch (FormatException exception)
		{
			throw new InvalidOperationException($"'{KeyringOptions.SectionName}:{nameof(KeyringOptions.CertificateBase64)}' is not valid base64.", exception);
		}

		try
		{
			return X509CertificateLoader.LoadPkcs12(certificateBytes, certificatePassword);
		}
		catch (CryptographicException exception)
		{
			throw new InvalidOperationException($"'{KeyringOptions.SectionName}:{nameof(KeyringOptions.CertificateBase64)}' could not be loaded as a PKCS#12 certificate. Verify the certificate and that '{KeyringOptions.SectionName}:{nameof(KeyringOptions.CertificatePassword)}' matches it.", exception);
		}
	}
}