namespace PanoramaMusic.Api.Configurations;

public sealed class AuthRateLimitOptions
{
	public const string SectionName = "RateLimiting:Auth";

	public required int IpPermitLimit { get; set; }

	public required int AccountPermitLimit { get; set; }

	public required int WindowSeconds { get; set; }
}