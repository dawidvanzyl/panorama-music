namespace PanoramaMusic.Identity.Infrastructure.Configuration;

public class JwtOptions
{
	public const string SectionName = "JWT";

	public string Secret { get; set; } = string.Empty;
}