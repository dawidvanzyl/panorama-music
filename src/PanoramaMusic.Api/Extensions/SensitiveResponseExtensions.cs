using PanoramaMusic.Api.Middleware;

namespace PanoramaMusic.Api.Extensions;

public static class SensitiveResponseExtensions
{
	/// <summary>
	/// Marks an endpoint as returning sensitive data, so <see cref="SecurityHeadersMiddleware"/>
	/// adds <c>Cache-Control: no-store</c> to its responses and neither the browser nor any
	/// intermediary retains them.
	/// <para>
	/// A response is <b>sensitive</b> when its body contains, or lets the caller derive, data
	/// about an identifiable person — a name, email address, date of birth, contact detail, IP
	/// address or device label — or a credential, token or invite URL. It is <b>not</b> sensitive
	/// when its body carries only reference data, aggregate counts, or values that identify
	/// nobody. Judge the body alone: a route parameter is not part of what a cache stores against
	/// the response. Note that write endpoints echoing the record back are sensitive on the same
	/// terms as the <c>GET</c> that returns it.
	/// </para>
	/// <para>
	/// Every endpoint returning a typed 200/201 body must have its verdict recorded in
	/// <c>CacheClassificationTests</c>, which fails by name if one is missing — that record is
	/// how "considered and cleared" is told apart from "never considered".
	/// </para>
	/// </summary>
	public static TBuilder MarkSensitiveResponse<TBuilder>(this TBuilder builder)
		where TBuilder : IEndpointConventionBuilder
		=> builder.WithMetadata(new SensitiveResponseMetadata());
}