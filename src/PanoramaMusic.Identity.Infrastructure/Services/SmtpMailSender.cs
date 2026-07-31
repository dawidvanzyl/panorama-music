using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Application.Models;
using PanoramaMusic.Identity.Infrastructure.Configurations;

namespace PanoramaMusic.Identity.Infrastructure.Services;

/// <summary>
/// Sends mail over SMTP via MailKit. One of the two permitted egress destinations under the
/// outbound allowlist of ASVS 5.0.0-13.2.5 — the host and port come from operator
/// configuration and are never influenced by user input.
/// <para>
/// Header injection (ASVS 5.0.0-1.3.11) is prevented by MimeKit rather than by us:
/// <c>MailboxAddress.Parse</c> rejects malformed addresses and <c>MimeMessage</c> encodes
/// header values, so a CR/LF in a field cannot forge a header.
/// </para>
/// </summary>
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