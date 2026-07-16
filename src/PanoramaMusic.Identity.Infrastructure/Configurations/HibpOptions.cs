namespace PanoramaMusic.Identity.Infrastructure.Configurations;

public sealed class HibpOptions
{
	public const string SectionName = "Hibp";

	public bool Enabled { get; set; } = true;
}