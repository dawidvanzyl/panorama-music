using PanoramaMusic.Identity.Application.Interfaces;

namespace PanoramaMusic.Identity.Infrastructure.Configurations;

public sealed class AppOptions : IAppOptions
{
	public string AppBaseUrl { get; set; } = string.Empty;
}