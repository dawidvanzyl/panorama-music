using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Application.Models;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace PanoramaMusic.Identity.Infrastructure.Services;

/// <summary>
/// Sends mail through the Maileroo HTTP API — the Production transport, since the hosting
/// provider blocks outbound SMTP. One of the two permitted egress destinations under the
/// outbound allowlist of ASVS 5.0.0-13.2.5; the base address is registered on the injected
/// client and is never derived from user input.
/// <para>
/// Header injection (ASVS 5.0.0-1.3.11) has no protocol surface here: the message is carried
/// as a JSON body over HTTPS, so a CR/LF in a field is serialized as data, not as a header
/// boundary.
/// </para>
/// </summary>
public sealed class MailerooMailSender(HttpClient httpClient) : IMailSender
{
	public async Task SendAsync(EmailMessage message, CancellationToken cancellationToken)
	{
		var payload = new MailerooRequest(
			new MailerooAddress(message.From, message.FromDisplayName),
			[new MailerooAddress(message.To, null)],
			new MailerooAddress(message.ReplyTo, message.FromDisplayName),
			message.Subject,
			message.Html);

		using var response = await httpClient.PostAsJsonAsync("api/v2/emails", payload, cancellationToken);
		var responseText = await response.Content.ReadAsStringAsync(cancellationToken);

		MailerooResponse? body;
		try
		{
			body = string.IsNullOrWhiteSpace(responseText) ? null : JsonSerializer.Deserialize<MailerooResponse>(responseText);
		}
		catch (JsonException)
		{
			body = null;
		}

		if (!response.IsSuccessStatusCode || body is null || !body.Success)
			throw new InvalidOperationException($"Maileroo email send failed ({(int)response.StatusCode} {response.ReasonPhrase}): {body?.Message ?? responseText}");
	}

	private sealed record MailerooRequest(
		[property: JsonPropertyName("from")] MailerooAddress From,
		[property: JsonPropertyName("to")] MailerooAddress[] To,
		[property: JsonPropertyName("reply_to")] MailerooAddress ReplyTo,
		[property: JsonPropertyName("subject")] string Subject,
		[property: JsonPropertyName("html")] string Html);

	private sealed record MailerooAddress(
		[property: JsonPropertyName("address")] string Address,
		[property: JsonPropertyName("display_name")] string? DisplayName);

	private sealed record MailerooResponse(
		[property: JsonPropertyName("success")] bool Success,
		[property: JsonPropertyName("message")] string? Message);
}