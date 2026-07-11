namespace PanoramaMusic.Api.Extensions;

public static class ConfigurationExtensions
{
	public static string GetRequiredConnectionString(this IConfiguration configuration, string name)
	{
		var connectionString = configuration.GetConnectionString(name);

		return string.IsNullOrWhiteSpace(connectionString)
			? throw new InvalidOperationException($"Connection string '{name}' is not configured.")
			: connectionString;
	}
}