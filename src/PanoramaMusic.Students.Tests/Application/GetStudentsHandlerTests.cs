using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Students.Application.Handlers.Students;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.ValueObjects;
using PanoramaMusic.Students.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Application;

public class GetStudentsHandlerTests : IClassFixture<StudentsTestFixture>
{
	private readonly StudentsTestContext _context;
	private readonly GetStudentsHandler _handler;

	public GetStudentsHandlerTests(StudentsTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<GetStudentsHandler>();
	}

	[Fact]
	[Trait("AC", "200UC8")]
	public async Task HandleAsync_StudentsExist_ReturnsFullRoster()
	{
		var alice = StudentFactory.Create(firstName: "Alice", lastName: "Vance", grade: GradeType.Grade4);
		var julian = StudentFactory.Create(firstName: "Julian", lastName: "Thorne", grade: GradeType.Grade5);
		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
			.ReturnsAsync([new RosterStudent(alice, []), new RosterStudent(julian, [])]);

		var result = await _handler.HandleAsync(TestContext.Current.CancellationToken);

		result.Select(s => s.StudentId).ShouldBe([alice.StudentId, julian.StudentId]);
	}

	[Fact]
	[Trait("AC", "200UC8")]
	public async Task HandleAsync_NoStudents_ReturnsEmptyList()
	{
		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
			.ReturnsAsync([]);

		var result = await _handler.HandleAsync(TestContext.Current.CancellationToken);

		result.ShouldBeEmpty();
	}

	[Fact]
	[Trait("AC", "341UC1")]
	public async Task HandleAsync_StudentsWithAndWithoutCourses_CarryTheirTeacherIds()
	{
		var withCourses = StudentFactory.Create(firstName: "Thandi", lastName: "Mokoena");
		var withoutCourses = StudentFactory.Create(firstName: "Amara", lastName: "Osei");
		var anna = Guid.NewGuid();
		var ravi = Guid.NewGuid();
		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
			.ReturnsAsync([new RosterStudent(withCourses, [anna, ravi]), new RosterStudent(withoutCourses, [])]);

		var result = await _handler.HandleAsync(TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result[0].TeacherIds.ShouldBe([anna, ravi]),
			() => result[1].TeacherIds.ShouldBeEmpty());
	}

	[Fact]
	[Trait("AC", "341UC2")]
	public async Task HandleAsync_TwoCoursesUnderTheSameTeacher_CarriesThatTeacherOnce()
	{
		var student = StudentFactory.Create();
		var anna = Guid.NewGuid();
		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
			.ReturnsAsync([new RosterStudent(student, [anna, anna])]);

		var result = await _handler.HandleAsync(TestContext.Current.CancellationToken);

		result.Single().TeacherIds.ShouldBe([anna]);
	}
}