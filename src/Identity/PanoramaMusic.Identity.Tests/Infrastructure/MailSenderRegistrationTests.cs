using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Infrastructure.Extensions;
using PanoramaMusic.Identity.Infrastructure.Services;
using Shouldly;
using System.Collections.Generic;
using Xunit;

namespace PanoramaMusic.Tests.Identity.Infrastructure;

public class MailSenderRegistrationTests
{
	private static ServiceProvider BuildProvider(string provider, string? mailerooApiKey)
	{
		var settings = new Dictionary<string, string?>
		{
			["Email:Provider"] = provider,
			["Email:From"] = "noreply@panorama-music.test",
			["Email:FromDisplayName"] = "Panorama Music",
			["Smtp:Host"] = "localhost",
			["Smtp:Port"] = "25",
			["Maileroo:ApiKey"] = mailerooApiKey,
			["Maileroo:BaseUrl"] = "https://smtp.maileroo.com/",
			["AppBaseUrl"] = "http://localhost",
		};

		var configuration = new ConfigurationBuilder().AddInMemoryCollection(settings).Build();

		var services = new ServiceCollection();
		services.AddIdentityInfrastructure(configuration);

		return services.BuildServiceProvider();
	}

	[Fact]
	[Trait("AC", "181UC5")]
	public void AddIdentityInfrastructure_ProviderIsMaileroo_ResolvesMailerooMailSender()
	{
		using var serviceProvider = BuildProvider("Maileroo", "test-api-key");

		var mailSender = serviceProvider.GetRequiredService<IMailSender>();

		mailSender.ShouldBeOfType<MailerooMailSender>();
	}

	[Fact]
	[Trait("AC", "181UC5")]
	public void AddIdentityInfrastructure_ProviderIsSmtp_ResolvesSmtpMailSender()
	{
		using var serviceProvider = BuildProvider("Smtp", mailerooApiKey: null);

		var mailSender = serviceProvider.GetRequiredService<IMailSender>();

		mailSender.ShouldBeOfType<SmtpMailSender>();
	}

	[Fact]
	[Trait("AC", "181UC5")]
	public void AddIdentityInfrastructure_MailerooSelectedWithoutApiKey_ThrowsClearError()
	{
		using var serviceProvider = BuildProvider("Maileroo", mailerooApiKey: null);

		Should.Throw<InvalidOperationException>(() => serviceProvider.GetRequiredService<IMailSender>());
	}
}