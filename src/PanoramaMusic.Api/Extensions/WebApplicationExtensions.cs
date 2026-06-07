using PanoramaMusic.Identity.Infrastructure.Services;
using PanoramaMusic.Infrastructure.Persistence;

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

		DatabaseMigrator.Run(connectionString,
			ensureDatabase: app.Environment.IsDevelopment(),
			typeof(AdminSeedService).Assembly);
	}
}