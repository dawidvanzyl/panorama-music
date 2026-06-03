namespace PanoramaMusic.Api.Routes;

public static class HealthRoutes
{
	public static void MapHealthRoutes(this WebApplication app)
	{
		app.MapGet("/api/health", () => Results.Ok(new { status = "healthy" }))
		   .WithName("GetHealth")
		   .WithTags("Health")
		   .Produces(StatusCodes.Status200OK);
	}
}