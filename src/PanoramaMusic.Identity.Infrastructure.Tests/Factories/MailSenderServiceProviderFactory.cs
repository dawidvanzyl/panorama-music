using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using PanoramaMusic.Identity.Infrastructure.Extensions;

namespace PanoramaMusic.Identity.Infrastructure.Tests.Factories;

internal static class MailSenderServiceProviderFactory
{
	internal static ServiceProvider Build(string provider, string? mailerooApiKey)
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
}