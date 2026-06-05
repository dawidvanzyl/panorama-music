namespace PanoramaMusic.Identity.Infrastructure.Configuration;

public class AdminOptions
{
	public const string SectionName = "Admin";

	public string Email { get; set; } = string.Empty;

	public string Password { get; set; } = string.Empty;
}