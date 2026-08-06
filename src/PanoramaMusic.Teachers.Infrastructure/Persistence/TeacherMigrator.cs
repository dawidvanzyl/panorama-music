using PanoramaMusic.Persistence;

namespace PanoramaMusic.Teachers.Infrastructure.Persistence;

public static class TeacherMigrator
{
	public static void Run(string connectionString)
	{
		DatabaseMigrator.RunAssembly(connectionString, typeof(TeacherMigrator).Assembly);
	}
}