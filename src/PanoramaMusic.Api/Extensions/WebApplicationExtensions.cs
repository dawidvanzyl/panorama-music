using PanoramaMusic.Identity.Infrastructure.Persistence;
using PanoramaMusic.Persistence;
using PanoramaMusic.Students.Infrastructure.Persistence;

namespace PanoramaMusic.Api.Extensions;

public static class WebApplicationExtensions
{
	public static void InitializeDatabase(this WebApplication app)
	{
		var connectionString = app.Configuration.GetConnectionString("DefaultConnection")!;

		var resetDb = string.Equals(
			app.Configuration["RESET_DB"],
			"true",
			StringComparison.OrdinalIgnoreCase);

		if (resetDb)
		{
			DatabaseMigrator.Reset(connectionString);
		}

		DatabaseMigrator.Run(connectionString, ensureDatabase: app.Environment.IsDevelopment());
		IdentityMigrator.Run(connectionString);
		StudentMigrator.Run(connectionString);
	}
}