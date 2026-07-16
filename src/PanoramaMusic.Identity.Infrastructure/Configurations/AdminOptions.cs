using PanoramaMusic.Identity.Application.Interfaces;

namespace PanoramaMusic.Identity.Infrastructure.Configurations;

public class AdminOptions : IAdminOptions
{
	public const string SectionName = "Admin";

	public string Email { get; set; } = string.Empty;

	public string Password { get; set; } = string.Empty;

	public string SeedAdminEmail => Email;
}