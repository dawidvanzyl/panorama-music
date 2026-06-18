namespace PanoramaMusic.Identity.Application.Interfaces;

public interface IEmailService
{
	Task SendPasswordResetAsync(string to, string rawToken, CancellationToken cancellationToken);
}