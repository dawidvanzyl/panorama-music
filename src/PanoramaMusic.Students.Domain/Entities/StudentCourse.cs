using PanoramaMusic.Domain;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Events.StudentCourses;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Messages;
using PanoramaMusic.Students.Domain.ValueObjects;

namespace PanoramaMusic.Students.Domain.Entities;

/// <summary>
/// A single student's enrollment in a single course. It holds the course itself
/// rather than just its identifier — the course type is what decides whether the
/// enrollment records an instrument and a step, so an enrollment can only be
/// built from a course that was actually read back.
/// </summary>
public sealed class StudentCourse : AggregateRoot
{
	public StudentCourse(
		Guid studentCourseId,
		Guid studentId,
		Course course,
		Guid teacherId,
		DateOnly enrolledDate,
		StudentInstrument? instrument)
	{
		StudentCourseId = studentCourseId;
		StudentId = studentId;
		Course = course;
		TeacherId = teacherId;
		EnrolledDate = enrolledDate;
		Instrument = instrument;
	}

	public Guid StudentCourseId { get; }

	public Guid StudentId { get; }

	public Course Course { get; }

	/// <summary>Exactly one teacher — never zero, never several.</summary>
	public Guid TeacherId { get; }

	public DateOnly EnrolledDate { get; }

	/// <summary>
	/// Null when the course type records neither an instrument type nor a step.
	/// </summary>
	public StudentInstrument? Instrument { get; }

	public static StudentCourse Enroll(
		Guid studentCourseId,
		Student student,
		Course course,
		DirectoryTeacher teacher,
		DateOnly enrolledDate,
		InstrumentType? instrumentType,
		StepType? stepType)
	{
		var instrument = BuildInstrument(course.CourseType, instrumentType, stepType);

		var enrollment = new StudentCourse(
			studentCourseId,
			student.StudentId,
			course,
			teacher.TeacherId,
			enrolledDate,
			instrument);

		enrollment.Raise(new StudentEnrolled(student, enrollment, teacher));
		return enrollment;
	}

	/// <summary>
	/// The course type governs what an enrollment records: an instrument course
	/// records an instrument type and a step, a theory course a step alone, and
	/// every other course type neither. Anything else is refused rather than
	/// quietly dropped.
	/// </summary>
	private static StudentInstrument? BuildInstrument(
		CourseType courseType,
		InstrumentType? instrumentType,
		StepType? stepType) =>
		courseType switch
		{
			CourseType.Instrument => BuildInstrumentCourseInstrument(instrumentType, stepType),
			CourseType.Theory => BuildTheoryCourseInstrument(instrumentType, stepType),
			_ => RefuseInstrumentAndStep(instrumentType, stepType),
		};

	private static StudentInstrument BuildInstrumentCourseInstrument(InstrumentType? instrumentType, StepType? stepType) =>
		(instrumentType, stepType) switch
		{
			(null, _) => throw new DomainException(StudentEnrollmentMessages.InstrumentCourseRequiresInstrumentType),
			(_, null) => throw new DomainException(StudentEnrollmentMessages.InstrumentCourseRequiresStep),
			var (instrument, step) => new StudentInstrument(instrument, step.Value),
		};

	private static StudentInstrument BuildTheoryCourseInstrument(InstrumentType? instrumentType, StepType? stepType) =>
		(instrumentType, stepType) switch
		{
			(not null, _) => throw new DomainException(StudentEnrollmentMessages.TheoryCourseRecordsNoInstrumentType),
			(_, null) => throw new DomainException(StudentEnrollmentMessages.TheoryCourseRequiresStep),
			var (_, step) => new StudentInstrument(InstrumentType: null, step.Value),
		};

	/// <summary>Every other course type records neither, so supplying either is refused.</summary>
	private static StudentInstrument? RefuseInstrumentAndStep(InstrumentType? instrumentType, StepType? stepType) =>
		(instrumentType, stepType) switch
		{
			(not null, _) => throw new DomainException(StudentEnrollmentMessages.CourseRecordsNoInstrumentType),
			(_, not null) => throw new DomainException(StudentEnrollmentMessages.CourseRecordsNoStep),
			_ => null,
		};
}