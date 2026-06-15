namespace PanoramaMusic.Identity.Application;

public static class InviteUrlBuilder
{
	public static string Build(string rawToken) => $"/#/register?token={rawToken}";
}