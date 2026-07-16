using PanoramaMusic.Persistence;

namespace PanoramaMusic.Students.Infrastructure.Persistence;

public static class StudentMigrator
{
	public static void Run(string connectionString)
	{
		DatabaseMigrator.RunAssembly(connectionString, typeof(StudentMigrator).Assembly);
	}
}