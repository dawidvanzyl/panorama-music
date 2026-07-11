namespace PanoramaMusic.Identity.Infrastructure.Configurations;

public sealed class SmtpOptions
{
	public const string SectionName = "Smtp";

	public string Host { get; set; } = string.Empty;
	public int Port { get; set; } = 587;
}