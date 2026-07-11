namespace PanoramaMusic.Identity.Application.Interfaces;

public interface IAccessTokenContext
{
	Guid? Jti { get; }
	DateTime? ExpiresAtUtc { get; }
}