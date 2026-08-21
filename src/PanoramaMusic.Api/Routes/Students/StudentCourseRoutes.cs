using PanoramaMusic.Api.Extensions;
using PanoramaMusic.Api.Filters;
using PanoramaMusic.Students.Application.Commands.StudentCourses;
using PanoramaMusic.Students.Application.Handlers.StudentCourses;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Application.Requests.StudentCourses;

namespace PanoramaMusic.Api.Routes.Students;

public static class StudentCourseRoutes
{
	public static void MapStudentCourseRoutes(this WebApplication app)
	{
		// Enrollment is maintained from Student Management, so it carries that
		// screen's boundary rather than course maintenance's — see StudentRoutes.
		var group = app
			.MapGroup("/api/students")
			.WithTags("Enrollment")
			.RequireAuthorization("TeacherOrAdminPolicy");

		group
			.MapPost("/{studentId:guid}/courses", async (Guid studentId, EnrollStudentRequest request, EnrollStudentHandler handler, CancellationToken ct) =>
			{
				var command = new EnrollStudentCommand(studentId, request);
				var result = await handler.HandleAsync(command, ct);
				return Results.Created($"/api/students/{studentId}/courses/{result.StudentCourseId}", result);
			})
			.AddEndpointFilter<ValidationFilter<EnrollStudentRequest>>()
			.MarkSensitiveResponse()
			.WithName("EnrollStudent")
			.Produces<StudentCourseResult>(StatusCodes.Status201Created)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);

		group
			.MapGet("/{studentId:guid}/courses", async (Guid studentId, GetStudentCoursesHandler handler, CancellationToken ct) =>
			{
				var result = await handler.HandleAsync(studentId, ct);
				return Results.Ok(result);
			})
			.MarkSensitiveResponse()
			.WithName("GetStudentCourses")
			.Produces<IList<StudentCourseResult>>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);

		// The assigned teacher and the instrument and step the course type
		// records are the whole of an enrollment's mutable state, so the update
		// is a PUT carrying a full representation of it. Correcting the course or
		// the enrolled date means withdrawing and re-enrolling.
		group
			.MapPut("/{studentId:guid}/courses/{studentCourseId:guid}", async (Guid studentId, Guid studentCourseId, UpdateEnrollmentRequest request, UpdateEnrollmentHandler handler, CancellationToken ct) =>
			{
				var command = new UpdateEnrollmentCommand(studentId, studentCourseId, request);
				var result = await handler.HandleAsync(command, ct);
				return Results.Ok(result);
			})
			.AddEndpointFilter<ValidationFilter<UpdateEnrollmentRequest>>()
			.MarkSensitiveResponse()
			.WithName("UpdateEnrollment")
			.Produces<StudentCourseResult>(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);

		// Refused while it is the student's last remaining enrollment. The
		// interface does not offer the confirmation until then, but this endpoint
		// is where the rule is actually enforced.
		group
			.MapDelete("/{studentId:guid}/courses/{studentCourseId:guid}", async (Guid studentId, Guid studentCourseId, WithdrawEnrollmentHandler handler, CancellationToken ct) =>
			{
				var command = new WithdrawEnrollmentCommand(studentId, studentCourseId);
				await handler.HandleAsync(command, ct);
				return Results.Ok();
			})
			.WithName("WithdrawEnrollment")
			.Produces(StatusCodes.Status200OK)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status401Unauthorized)
			.Produces(StatusCodes.Status403Forbidden)
			.Produces(StatusCodes.Status404NotFound);
	}
}