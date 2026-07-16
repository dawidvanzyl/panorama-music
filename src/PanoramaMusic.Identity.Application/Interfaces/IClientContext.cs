namespace PanoramaMusic.Identity.Application.Interfaces;

public interface IClientContext
{
	string? UserAgent { get; }
	string? IpAddress { get; }
}