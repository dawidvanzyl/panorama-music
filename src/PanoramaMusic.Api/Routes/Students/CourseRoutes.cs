using PanoramaMusic.Api.Filters;
using PanoramaMusic.Students.Application.Commands.Courses;
using PanoramaMusic.Students.Application.Handlers.Courses;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Application.Requests.Courses;

namespace PanoramaMusic.Api.Routes.Students;

public static class CourseRoutes
{
	public static void MapCourseRoutes(this WebApplication app)
	{
		// Reading the catalogue is open to every staff role — a Teacher needs to
		// see what the school offers. Defining a course is Coordinator-or-Admin.
		app
			.MapGroup("/api/courses")
			.WithTags("Courses")
			.RequireAuthorization("TeacherCoordinatorOrAdminPolicy")
			.MapGet("/", async ([AsParameters] GetCoursesRequest request, GetCoursesHandler handler, CancellationToken ct) =>
			{
				var result = await handler.HandleAsync(request, ct);
				return Results.Ok(result);
			})
			.WithName("GetCourses")
			.Produces<IList<CourseResult>>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden);

		app
			.MapGroup("/api/courses")
			.WithTags("Courses")
			.RequireAuthorization("CoordinatorOrAdminPolicy")
			.MapPost("/", async (CreateCourseRequest request, CreateCourseHandler handler, CancellationToken ct) =>
			{
				var command = new CreateCourseCommand(request);
				var result = await handler.HandleAsync(command, ct);
				return Results.Created($"/api/courses/{result.CourseId}", result);
			})
			.AddEndpointFilter<ValidationFilter<CreateCourseRequest>>()
			.WithName("CreateCourse")
			.Produces<CourseResult>(StatusCodes.Status201Created)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden);
	}
}
