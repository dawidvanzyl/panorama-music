using PanoramaMusic.Audit.Infrastructure.Persistence;
using PanoramaMusic.DataProtection.Persistence;
using PanoramaMusic.Identity.Infrastructure.Persistence;
using PanoramaMusic.Persistence;
using PanoramaMusic.Students.Infrastructure.Persistence;

namespace PanoramaMusic.Api.Extensions;

public static class WebApplicationExtensions
{
	public static void InitializeDatabase(this WebApplication app)
	{
		// The application connects as the restricted panorama_app role;
		// migrations run over the privileged Migrations connection so migrated
		// objects stay owned by the migration role, not the application role.
		var applicationConnectionString = app.Configuration.GetConnectionString("DefaultConnection")!;
		var migrationConnectionString = app.Configuration.GetConnectionString("Migrations")!;

		var resetDb = string.Equals(
			app.Configuration["RESET_DB"],
			"true",
			StringComparison.OrdinalIgnoreCase);

		if (resetDb)
		{
			DatabaseMigrator.Reset(migrationConnectionString);
		}

		DatabaseMigrator.Run(migrationConnectionString, ensureDatabase: app.Environment.IsDevelopment());
		DatabaseMigrator.EnsureApplicationRole(migrationConnectionString, applicationConnectionString);

		// Context migrators execute in a fixed order: DataProtection → Audit → Identity
		// → Students. DataProtection runs first since it has no dependency on any other
		// context and its keyring must exist before anything else could protect a value.
		// Maintain this order as new contexts are added.
		DataProtectionMigrator.Run(migrationConnectionString);
		AuditMigrator.Run(migrationConnectionString);
		IdentityMigrator.Run(migrationConnectionString);
		StudentMigrator.Run(migrationConnectionString);
	}
}