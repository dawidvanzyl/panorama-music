using PanoramaMusic.Persistence;

namespace PanoramaMusic.DataProtection.Persistence;

public static class DataProtectionMigrator
{
	public static void Run(string connectionString)
	{
		DatabaseMigrator.RunAssembly(connectionString, typeof(DataProtectionMigrator).Assembly);
	}
}