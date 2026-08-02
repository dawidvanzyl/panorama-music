using Dapper;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using PanoramaMusic.DataProtection.Extensions;
using PanoramaMusic.Persistence.Extensions;
using PanoramaMusic.Persistence.Tests.Fixtures;
using Shouldly;
using System.Security.Cryptography;
using Xunit;

namespace PanoramaMusic.Persistence.Tests;

/// <summary>
/// Exercises the PostgreSQL-backed Data Protection keyring against a real
/// database. Each test builds its own service provider — the framework caches
/// its key ring per provider, so a fresh provider is what makes "does this
/// survive a restart" an honest question rather than a memory-cache hit.
/// </summary>
public sealed class DataProtectionKeyringTests(UnitOfWorkDatabaseFixture fixture)
	: IClassFixture<UnitOfWorkDatabaseFixture>
{
	private const string _bankingPurpose = "banking-details";

	private ServiceProvider BuildProvider(Dictionary<string, string?>? configOverrides = null)
	{
		var config = new Dictionary<string, string?>
		{
			["DataProtection:ApplicationName"] = "PanoramaMusicTests",
			["DataProtection:KeyProtection"] = "None",
		};

		foreach (var (key, value) in configOverrides ?? [])
			config[key] = value;

		var configuration = new ConfigurationBuilder().AddInMemoryCollection(config).Build();

		var services = new ServiceCollection();
		services.AddInfrastructure(fixture.ApplicationConnectionString);
		services.AddDataProtectionInfrastructure(configuration);
		return services.BuildServiceProvider();
	}

	private static string Protect(ServiceProvider provider, string purpose, string plaintext)
		=> provider.GetRequiredService<IDataProtectionProvider>().CreateProtector(purpose).Protect(plaintext);

	private static string Unprotect(ServiceProvider provider, string purpose, string payload)
		=> provider.GetRequiredService<IDataProtectionProvider>().CreateProtector(purpose).Unprotect(payload);

	[Fact]
	[Trait("AC", "230UC1")]
	public void Unprotect_IndependentlyConstructedProviderOverSameKeyring_ReturnsOriginalValue()
	{
		// Arrange
		using var firstProvider = BuildProvider();
		var protectedValue = Protect(firstProvider, _bankingPurpose, "account-number-1234");

		// Act
		using var secondProvider = BuildProvider();
		var unprotectedValue = Unprotect(secondProvider, _bankingPurpose, protectedValue);

		// Assert
		unprotectedValue.ShouldBe("account-number-1234");
	}

	[Fact]
	[Trait("AC", "230UC2")]
	public async Task Protect_FirstPayloadAgainstEmptyStore_WritesKeyMaterialReadableBySubsequentProvider()
	{
		// Arrange — assert against an empty store, independent of any other test's keys.
		// Uses the privileged migration connection: panorama_app is deliberately granted
		// only INSERT and SELECT on the keyring, since the framework never deletes keys.
		await using var connection = new NpgsqlConnection(fixture.MigrationConnectionString);
		await connection.OpenAsync(TestContext.Current.CancellationToken);
		await connection.ExecuteAsync("DELETE FROM data_protection.keys");

		// Act
		using var writingProvider = BuildProvider();
		var protectedValue = Protect(writingProvider, _bankingPurpose, "first-write-value");

		// Assert
		var keyCount = await connection.ExecuteScalarAsync<long>("SELECT COUNT(*) FROM data_protection.keys");
		using var readingProvider = BuildProvider();

		keyCount.ShouldBe(1);
		Unprotect(readingProvider, _bankingPurpose, protectedValue).ShouldBe("first-write-value");
	}

	[Fact]
	[Trait("AC", "230UC3")]
	public void AddDataProtectionInfrastructure_CertificateModeWithoutCertificate_ThrowsNamingTheMissingCertificate()
	{
		// Act
		var exception = Should.Throw<InvalidOperationException>(() =>
			BuildProvider(new Dictionary<string, string?>
			{
				["DataProtection:KeyProtection"] = "Certificate",
			}));

		// Assert
		exception.Message.ShouldContain("CertificateBase64");
	}

	[Fact]
	[Trait("AC", "230UC4")]
	public void AddDataProtectionInfrastructure_CertificateModeWithoutPassword_ThrowsNamingTheMissingPassword()
	{
		// Act
		var exception = Should.Throw<InvalidOperationException>(() =>
			BuildProvider(new Dictionary<string, string?>
			{
				["DataProtection:KeyProtection"] = "Certificate",
				["DataProtection:CertificateBase64"] = Convert.ToBase64String("not-a-real-certificate"u8.ToArray()),
			}));

		// Assert
		exception.Message.ShouldContain("CertificatePassword");
	}

	[Fact]
	[Trait("AC", "230UC5")]
	public void Protect_KeyProtectionNoneWithoutCertificateConfiguration_StartsUpAndRoundTripsValue()
	{
		// Act
		using var provider = BuildProvider();
		var protectedValue = Protect(provider, _bankingPurpose, "plain-value");

		// Assert
		Unprotect(provider, _bankingPurpose, protectedValue).ShouldBe("plain-value");
	}

	[Fact]
	[Trait("AC", "230UC6")]
	public void Unprotect_PayloadFromBankingPurposeUsingDifferentPurpose_Throws()
	{
		// Arrange
		using var provider = BuildProvider();
		var protectedValue = Protect(provider, _bankingPurpose, "account-number-5678");

		// Act & Assert
		Should.Throw<CryptographicException>(() => Unprotect(provider, "a-different-purpose", protectedValue));
	}
}