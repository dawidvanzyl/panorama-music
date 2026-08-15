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
		// The list is unfiltered; narrowing it is the screen's concern, as it is
		// for students.
		app
			.MapGroup("/api/courses")
			.WithTags("Courses")
			.RequireAuthorization("TeacherCoordinatorOrAdminPolicy")
			.MapGet("/", async (GetCoursesHandler handler, CancellationToken ct) =>
			{
				var result = await handler.HandleAsync(ct);
				return Results.Ok(result);
			})
			.WithName("GetCourses")
			.Produces<IList<CourseResult>>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden);

		var maintenanceGroup = app
			.MapGroup("/api/courses")
			.WithTags("Courses")
			.RequireAuthorization("CoordinatorOrAdminPolicy");

		maintenanceGroup
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

		// Cost is the whole of a course's mutable state, so the update is a PUT
		// carrying a full representation of it rather than a partial one.
		maintenanceGroup
			.MapPut("/{courseId:guid}", async (Guid courseId, UpdateCourseRequest request, UpdateCourseCostHandler handler, CancellationToken ct) =>
			{
				var command = new UpdateCourseCostCommand(courseId, request);
				var result = await handler.HandleAsync(command, ct);
				return Results.Ok(result);
			})
			.AddEndpointFilter<ValidationFilter<UpdateCourseRequest>>()
			.WithName("UpdateCourseCost")
			.Produces<CourseResult>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);

		maintenanceGroup
			.MapDelete("/{courseId:guid}", async (Guid courseId, DeleteCourseHandler handler, CancellationToken ct) =>
			{
				var command = new DeleteCourseCommand(courseId);
				await handler.HandleAsync(command, ct);
				return Results.Ok();
			})
			.WithName("DeleteCourse")
			.Produces(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);
	}
}