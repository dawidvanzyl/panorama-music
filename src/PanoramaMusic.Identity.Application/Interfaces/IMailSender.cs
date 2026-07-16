using PanoramaMusic.Identity.Application.Models;

namespace PanoramaMusic.Identity.Application.Interfaces;

public interface IMailSender
{
	Task SendAsync(EmailMessage message, CancellationToken cancellationToken);
}