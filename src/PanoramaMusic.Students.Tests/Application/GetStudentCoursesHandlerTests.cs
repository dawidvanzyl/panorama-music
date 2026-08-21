using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Students.Application.Handlers.StudentCourses;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.ValueObjects;
using PanoramaMusic.Students.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Application;

public class GetStudentCoursesHandlerTests : IClassFixture<StudentsTestFixture>
{
	private readonly StudentsTestContext _context;
	private readonly GetStudentCoursesHandler _handler;

	public GetStudentCoursesHandlerTests(StudentsTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<GetStudentCoursesHandler>();
	}

	[Fact]
	[Trait("AC", "268UC10")]
	public async Task HandleAsync_StudentWithEnrollments_ReturnsEachWithItsCourseTeacherInstrumentStepAndEnrolledDate()
	{
		var studentId = Guid.NewGuid();
		var teacher = DirectoryTeacherFactory.Create(firstName: "Lindiwe", surname: "Mabaso");
		var structure = LessonStructureFactory.Create(
			lessonType: LessonType.Individual,
			durationType: DurationType.HalfHour,
			occurrenceType: OccurrenceType.DuringSchool);
		var course = CourseFactory.Create(courseType: CourseType.Instrument, lessonStructure: structure);
		var enrollment = StudentCourseFactory.Create(
			studentId: studentId,
			course: course,
			teacherId: teacher.TeacherId,
			enrolledDate: new DateOnly(2026, 1, 19),
			instrument: new StudentInstrument(InstrumentType.Piano, StepType.Step2A));
		GivenEnrollments(studentId, teacher, enrollment);

		var results = await _handler.HandleAsync(studentId, TestContext.Current.CancellationToken);

		var result = results.ShouldHaveSingleItem();
		ShouldlyHelpers.Satisfy(
			() => result.CourseId.ShouldBe(course.CourseId),
			() => result.CourseType.ShouldBe(CourseType.Instrument),
			() => result.LessonType.ShouldBe(LessonType.Individual),
			() => result.DurationType.ShouldBe(DurationType.HalfHour),
			() => result.OccurrenceType.ShouldBe(OccurrenceType.DuringSchool),
			() => result.TeacherId.ShouldBe(teacher.TeacherId),
			() => result.TeacherFirstName.ShouldBe("Lindiwe"),
			() => result.TeacherSurname.ShouldBe("Mabaso"),
			() => result.InstrumentType.ShouldBe(InstrumentType.Piano),
			() => result.StepType.ShouldBe(StepType.Step2A),
			() => result.EnrolledDate.ShouldBe(new DateOnly(2026, 1, 19)));
	}

	[Fact]
	[Trait("AC", "268UC11")]
	public async Task HandleAsync_StudentWithNoEnrollments_ReturnsAnEmptyList()
	{
		var studentId = Guid.NewGuid();
		_context.Repositories.StudentCourseRepositoryMock
			.Setup(r => r.GetByStudentIdAsync(studentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([]);

		var results = await _handler.HandleAsync(studentId, TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => results.ShouldBeEmpty(),
			// Nothing to name, so the directory is never asked.
			() => _context.Repositories.TeacherDirectoryMock.Verify(
				d => d.GetTeachersAsync(It.IsAny<IReadOnlyCollection<Guid>>(), It.IsAny<CancellationToken>()),
				Times.Never));
	}

	private void GivenEnrollments(Guid studentId, DirectoryTeacher teacher, params StudentCourse[] enrollments)
	{
		_context.Repositories.StudentCourseRepositoryMock
			.Setup(r => r.GetByStudentIdAsync(studentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(enrollments);
		_context.Repositories.TeacherDirectoryMock
			.Setup(d => d.GetTeachersAsync(It.IsAny<IReadOnlyCollection<Guid>>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync(new Dictionary<Guid, DirectoryTeacher> { [teacher.TeacherId] = teacher });
	}
}