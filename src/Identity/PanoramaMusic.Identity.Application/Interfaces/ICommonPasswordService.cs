namespace PanoramaMusic.Identity.Application.Interfaces;

public interface ICommonPasswordService
{
	Task<bool> ValidateAsync(string password, CancellationToken cancellationToken);
}