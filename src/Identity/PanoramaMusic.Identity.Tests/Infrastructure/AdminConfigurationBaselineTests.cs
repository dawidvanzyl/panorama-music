using Shouldly;
using System.Text.Json;
using Xunit;

namespace PanoramaMusic.Tests.Identity.Infrastructure;

public class AdminConfigurationBaselineTests
{
	[Fact]
	[Trait("AC", "M1.4UC12")]
	public void NonDevelopmentAppSettings_DoesNotContainDefaultAdminCredentials()
	{
		var appSettingsPath = FindAppSettingsPath();

		using var document = JsonDocument.Parse(File.ReadAllText(appSettingsPath));

		document.RootElement.TryGetProperty("Admin", out _).ShouldBeFalse();
	}

	private static string FindAppSettingsPath()
	{
		var directory = new DirectoryInfo(AppContext.BaseDirectory);
		while (directory is not null && !File.Exists(Path.Combine(directory.FullName, "PanoramaMusic.sln")))
			directory = directory.Parent;

		return directory is null
			? throw new InvalidOperationException("Could not locate solution root from test base directory.")
			: Path.Combine(directory.FullName, "PanoramaMusic.Api", "appsettings.json");
	}
}