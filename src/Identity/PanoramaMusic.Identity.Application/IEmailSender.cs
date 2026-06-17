namespace PanoramaMusic.Identity.Application;

public interface IEmailSender
{
	Task SendPasswordResetAsync(string to, string rawToken, CancellationToken cancellationToken);
}