using PanoramaMusic.Identity.Application.Interfaces;

namespace PanoramaMusic.Identity.Infrastructure.Configurations;

public class JwtOptions : ISessionOptions
{
	public const string SectionName = "JWT";

	public string Secret { get; set; } = string.Empty;

	public string Issuer { get; set; } = string.Empty;

	public string Audience { get; set; } = string.Empty;

	public int AbsoluteSessionLifetimeDays { get; set; }
}