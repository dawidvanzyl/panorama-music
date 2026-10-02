using PanoramaMusic.Persistence;

namespace PanoramaMusic.Reporting.Infrastructure.Persistence;

public static class ReportingMigrator
{
	public static void Run(string connectionString)
	{
		DatabaseMigrator.RunAssembly(connectionString, typeof(ReportingMigrator).Assembly);
	}
}