using Shouldly;
using System.Text.Json;
using Xunit;

namespace PanoramaMusic.Identity.Infrastructure.Tests;

public class AdminConfigurationBaselineTests
{
	private readonly string _appSettingsPath;

	public AdminConfigurationBaselineTests()
	{
		var directory = new DirectoryInfo(AppContext.BaseDirectory);
		while (directory is not null && !File.Exists(Path.Combine(directory.FullName, "PanoramaMusic.sln")))
			directory = directory.Parent;

		_appSettingsPath = directory is null
			? throw new InvalidOperationException("Could not locate solution root from test base directory.")
			: Path.Combine(directory.FullName, "PanoramaMusic.Api", "appsettings.json");
	}

	[Fact]
	[Trait("AC", "M1.4UC12")]
	public void NonDevelopmentAppSettings_DoesNotContainDefaultAdminCredentials()
	{
		using var document = JsonDocument.Parse(File.ReadAllText(_appSettingsPath));

		document.RootElement.TryGetProperty("Admin", out _).ShouldBeFalse();
	}
}