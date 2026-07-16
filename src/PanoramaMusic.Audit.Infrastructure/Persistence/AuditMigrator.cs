using PanoramaMusic.Persistence;

namespace PanoramaMusic.Audit.Infrastructure.Persistence;

public static class AuditMigrator
{
	public static void Run(string connectionString)
	{
		DatabaseMigrator.RunAssembly(connectionString, typeof(AuditMigrator).Assembly);
	}
}