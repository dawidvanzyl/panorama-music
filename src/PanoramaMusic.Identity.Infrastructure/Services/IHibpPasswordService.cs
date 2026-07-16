namespace PanoramaMusic.Identity.Infrastructure.Services;

public interface IHibpPasswordService
{
	Task<bool> ValidateAsync(string password, CancellationToken cancellationToken);
}