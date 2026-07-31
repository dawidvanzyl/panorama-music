using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PanoramaMusic.Identity.Infrastructure.Configurations;
using System.Security.Cryptography;
using System.Text;

namespace PanoramaMusic.Identity.Infrastructure.Services;

/// <summary>
/// Checks submitted passwords against the HIBP Pwned Passwords range (k-anonymity) endpoint
/// (ASVS 5.0.0-6.2.12). Only the first 5 hex characters of the password's SHA-1 hash are sent,
/// so the password itself is never transmitted. Fails open (treats the password as acceptable
/// and logs a warning) if the API is unreachable, so registration/reset never depends on a
/// third party's uptime.
/// <para>
/// The SHA-1 use is the scoped exemption to ASVS 5.0.0-11.4.1: the range protocol mandates
/// that digest purely as an anonymity-set bucketing function, which is neither an integrity
/// nor a secrecy use. It must not spread beyond this call.
/// </para>
/// <para>
/// One of the permitted egress destinations under the outbound allowlist of
/// ASVS 5.0.0-13.2.5; the base address is registered on the injected client and is never
/// derived from user input.
/// </para>
/// </summary>
public sealed class HibpPasswordService(
	HttpClient httpClient,
	IOptions<HibpOptions> options,
	ILogger<HibpPasswordService> logger) : IHibpPasswordService
{
	public async Task<bool> ValidateAsync(string password, CancellationToken cancellationToken)
	{
		if (!options.Value.Enabled)
			return true;

		var hash = Convert.ToHexString(SHA1.HashData(Encoding.UTF8.GetBytes(password)));
		var prefix = hash[..5];
		var suffix = hash[5..];

		try
		{
			using var response = await httpClient.GetAsync($"range/{prefix}", cancellationToken);
			response.EnsureSuccessStatusCode();
			var body = await response.Content.ReadAsStringAsync(cancellationToken);

			return !body.Split('\n').Any(line => line.StartsWith(suffix, StringComparison.OrdinalIgnoreCase));
		}
		catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
		{
			logger.LogWarning(ex, "HIBP password check unavailable; failing open.");
			return true;
		}
	}
}