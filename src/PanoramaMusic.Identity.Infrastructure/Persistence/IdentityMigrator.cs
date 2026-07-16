using PanoramaMusic.Persistence;

namespace PanoramaMusic.Identity.Infrastructure.Persistence;

public static class IdentityMigrator
{
	public static void Run(string connectionString)
	{
		DatabaseMigrator.RunAssembly(connectionString, typeof(IdentityMigrator).Assembly);
	}
}