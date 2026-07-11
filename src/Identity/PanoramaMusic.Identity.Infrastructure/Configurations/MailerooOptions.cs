namespace PanoramaMusic.Identity.Infrastructure.Configurations;

public sealed class MailerooOptions
{
	public const string SectionName = "Maileroo";

	public string ApiKey { get; set; } = string.Empty;
	public string BaseUrl { get; set; } = "https://smtp.maileroo.com/";
}