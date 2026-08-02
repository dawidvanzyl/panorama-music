using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.DataProtection.KeyManagement;
using Microsoft.AspNetCore.DataProtection.Repositories;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using PanoramaMusic.DataProtection.Configurations;
using PanoramaMusic.DataProtection.Enums;
using PanoramaMusic.DataProtection.Repositories;
using PanoramaMusic.Persistence.Factories;
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

		services.AddSingleton<IXmlRepository>(sp =>
			new PostgresXmlRepository(sp.GetRequiredService<IDbConnectionFactory>()));

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

			var certificateBytes = Convert.FromBase64String(options.CertificateBase64);
			var certificate = X509CertificateLoader.LoadPkcs12(certificateBytes, options.CertificatePassword);
			builder.ProtectKeysWithCertificate(certificate);
		}

		return services;
	}
}