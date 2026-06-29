namespace PanoramaMusic.Api.Extensions;

/// <summary>
/// Transports the refresh token as an <c>HttpOnly; Secure; SameSite=Strict</c> cookie
/// scoped to <c>/api/auth</c> so it is never readable from JavaScript.
/// </summary>
public static class RefreshTokenCookieExtensions
{
	public const string CookieName = "__Secure-refresh_token";

	private const string _cookiePath = "/api/auth";

	public static void SetRefreshTokenCookie(this HttpResponse response, string token, DateTime expiresAt)
	{
		response.Cookies.Append(CookieName, token, new CookieOptions
		{
			HttpOnly = true,
			Secure = true,
			SameSite = SameSiteMode.Strict,
			Path = _cookiePath,
			Expires = expiresAt,
		});
	}

	public static void ClearRefreshTokenCookie(this HttpResponse response)
	{
		response.Cookies.Delete(CookieName, new CookieOptions { Path = _cookiePath });
	}

	public static string? GetRefreshTokenCookie(this HttpRequest request)
		=> request.Cookies[CookieName];
}