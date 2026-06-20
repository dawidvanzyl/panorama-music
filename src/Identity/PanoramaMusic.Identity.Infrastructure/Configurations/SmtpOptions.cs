namespace PanoramaMusic.Identity.Infrastructure.Configurations;

public sealed class SmtpOptions
{
	public const string SectionName = "Smtp";

	public string Host { get; set; } = string.Empty;
	public int Port { get; set; } = 587;
	public string Username { get; set; } = string.Empty;
	public string Password { get; set; } = string.Empty;
	public string From { get; set; } = string.Empty;
	public string FromDisplayName { get; set; } = "Panorama Music";
}