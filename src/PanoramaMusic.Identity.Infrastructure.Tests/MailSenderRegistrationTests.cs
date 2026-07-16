using Microsoft.Extensions.DependencyInjection;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Infrastructure.Services;
using PanoramaMusic.Identity.Infrastructure.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Infrastructure.Tests;

public class MailSenderRegistrationTests
{
	[Fact]
	[Trait("AC", "181UC5")]
	public void AddIdentityInfrastructure_ProviderIsMaileroo_ResolvesMailerooMailSender()
	{
		using var serviceProvider = MailSenderServiceProviderFactory.Build("Maileroo", "test-api-key");

		var mailSender = serviceProvider.GetRequiredService<IMailSender>();

		mailSender.ShouldBeOfType<MailerooMailSender>();
	}

	[Fact]
	[Trait("AC", "181UC5")]
	public void AddIdentityInfrastructure_ProviderIsSmtp_ResolvesSmtpMailSender()
	{
		using var serviceProvider = MailSenderServiceProviderFactory.Build("Smtp", mailerooApiKey: null);

		var mailSender = serviceProvider.GetRequiredService<IMailSender>();

		mailSender.ShouldBeOfType<SmtpMailSender>();
	}

	[Fact]
	[Trait("AC", "181UC5")]
	public void AddIdentityInfrastructure_MailerooSelectedWithoutApiKey_ThrowsClearError()
	{
		using var serviceProvider = MailSenderServiceProviderFactory.Build("Maileroo", mailerooApiKey: null);

		Should.Throw<InvalidOperationException>(() => serviceProvider.GetRequiredService<IMailSender>());
	}
}