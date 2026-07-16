using PanoramaMusic.Identity.Infrastructure.Enums;

namespace PanoramaMusic.Identity.Infrastructure.Configurations;

public sealed class EmailOptions
{
	public const string SectionName = "Email";

	public EmailProvider Provider { get; set; } = EmailProvider.Smtp;
	public string From { get; set; } = string.Empty;
	public string ReplyTo { get; set; } = string.Empty;
	public string FromDisplayName { get; set; } = string.Empty;
}