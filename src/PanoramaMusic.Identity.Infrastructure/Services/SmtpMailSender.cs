using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Application.Models;
using PanoramaMusic.Identity.Infrastructure.Configurations;

namespace PanoramaMusic.Identity.Infrastructure.Services;

public sealed class SmtpMailSender(IOptions<SmtpOptions> options) : IMailSender
{
	private readonly SmtpOptions _options = options.Value;

	public async Task SendAsync(EmailMessage message, CancellationToken cancellationToken)
	{
		var mimeMessage = new MimeMessage();
		mimeMessage.From.Add(new MailboxAddress(message.FromDisplayName, message.From));
		mimeMessage.To.Add(MailboxAddress.Parse(message.To));
		mimeMessage.Subject = message.Subject;
		mimeMessage.Body = new TextPart("html") { Text = message.Html };

		using var client = new SmtpClient();
		await client.ConnectAsync(_options.Host, _options.Port, SecureSocketOptions.None, cancellationToken);
		await client.SendAsync(mimeMessage, cancellationToken);
		await client.DisconnectAsync(quit: true, cancellationToken);
	}
}