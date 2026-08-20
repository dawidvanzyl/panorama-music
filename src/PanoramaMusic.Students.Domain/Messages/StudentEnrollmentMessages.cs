namespace PanoramaMusic.Students.Domain.Messages;

/// <summary>
/// Why an enrollment was refused. The course type decides what an enrollment
/// records, so each refusal names the shape the chosen course actually calls for.
/// </summary>
public static class StudentEnrollmentMessages
{
	public const string InstrumentCourseRequiresInstrumentType = "An enrollment in an instrument course must record an instrument type.";

	public const string InstrumentCourseRequiresStep = "An enrollment in an instrument course must record a step.";

	public const string TheoryCourseRequiresStep = "An enrollment in a theory course must record a step.";

	public const string TheoryCourseRecordsNoInstrumentType = "An enrollment in a theory course records no instrument type.";

	public const string CourseRecordsNoInstrumentType = "An enrollment in this course type records no instrument type.";

	public const string CourseRecordsNoStep = "An enrollment in this course type records no step.";

	public const string AlreadyEnrolled = "The student is already enrolled in this course.";

	public const string LastEnrollmentCannotBeWithdrawn = "A student must remain enrolled in at least one course, so their last enrollment cannot be withdrawn.";
}