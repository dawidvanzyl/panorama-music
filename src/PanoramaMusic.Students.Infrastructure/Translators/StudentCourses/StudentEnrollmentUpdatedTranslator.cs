using PanoramaMusic.Audit.Application.Enums;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Domain;
using PanoramaMusic.Students.Application.Constants;
using PanoramaMusic.Students.Application.Interfaces;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Events.StudentCourses;

namespace PanoramaMusic.Students.Infrastructure.Translators.StudentCourses;

public sealed class StudentEnrollmentUpdatedTranslator(IAuditContext auditContext, IUserContext userContext) : IAuditEventTranslator
{
	public AuditLane Lane => AuditLane.Transactional;

	public bool CanTranslate(IDomainEvent domainEvent) => domainEvent is StudentEnrollmentUpdated;

	public AuditEvent Translate(IDomainEvent domainEvent)
	{
		var (student, before, after, teacher) = (StudentEnrollmentUpdated)domainEvent;
		var course = after.Course;

		return new AuditEvent(
			Guid.NewGuid(),
			DateTime.UtcNow,
			StudentCourseAuditEventTypes.StudentEnrollmentUpdated,
			userContext.UserId,
			userContext.Email,
			after.StudentCourseId,
			auditContext.SourceIp,
			auditContext.UserAgent,
			auditContext.CorrelationId,
			"success",
			null,
			new Dictionary<string, object?>
			{
				["targetDisplay"] = $"{student} · {course} · {teacher}",
				["studentId"] = student.StudentId,
				["courseId"] = course.CourseId,
				["changes"] = new Dictionary<string, object?>
				{
					["teacherId"] = new Dictionary<string, object?>
					{
						["before"] = before.TeacherId,
						["after"] = after.TeacherId,
					},
					["instrumentType"] = new Dictionary<string, object?>
					{
						["before"] = InstrumentTypeOf(before),
						["after"] = InstrumentTypeOf(after),
					},
					["stepType"] = new Dictionary<string, object?>
					{
						["before"] = StepTypeOf(before),
						["after"] = StepTypeOf(after),
					},
				},
			});
	}

	/// <summary>
	/// Null where the course type records nothing, so a field the enrollment
	/// never held reads as absent rather than as an empty string.
	/// </summary>
	private static string? InstrumentTypeOf(StudentCourse enrollment) =>
		enrollment.Instrument?.InstrumentType?.ToString();

	private static string? StepTypeOf(StudentCourse enrollment) =>
		enrollment.Instrument?.StepType.ToString();
}