using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Teachers.Application.Handlers.Teachers;
using PanoramaMusic.Teachers.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Teachers.Tests.Application;

public class GetTeachersHandlerTests : IClassFixture<TeachersTestFixture>
{
	private readonly TeachersTestContext _context;
	private readonly GetTeachersHandler _handler;

	public GetTeachersHandlerTests(TeachersTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<GetTeachersHandler>();
	}

	[Fact]
	[Trait("AC", "231UC3")]
	public async Task HandleAsync_MixedClassificationsAndStatuses_ReturnsAllViaSingleRepositoryCall()
	{
		var privateTeacher = TeacherFactory.Create(firstName: "Alice", surname: "Vance", isPrivate: true);
		var schoolPaidTeacher = TeacherFactory.Create(firstName: "Julian", surname: "Thorne", isPrivate: false);
		_context.Repositories.TeacherRepositoryMock
			.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
			.ReturnsAsync([privateTeacher, schoolPaidTeacher]);

		var result = await _handler.HandleAsync(TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.Select(t => t.TeacherId).ShouldBe([privateTeacher.TeacherId, schoolPaidTeacher.TeacherId]),
			() => result.ShouldContain(t => t.TeacherId == privateTeacher.TeacherId && t.IsPrivate && t.IsActive),
			() => result.ShouldContain(t => t.TeacherId == schoolPaidTeacher.TeacherId && !t.IsPrivate && t.IsActive),
			// The handler must obtain the full roster from exactly one repository call — no
			// per-row lookups — and GetAllAsync is the repository's single-query entry point.
			() => _context.Repositories.TeacherRepositoryMock.Verify(
				r => r.GetAllAsync(TestContext.Current.CancellationToken), Times.Once),
			() => _context.Repositories.TeacherRepositoryMock.Verify(
				r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never));
	}

	[Fact]
	[Trait("AC", "231UC4")]
	public async Task HandleAsync_PrivateTeacher_PrivateFlagReturnedInList()
	{
		var privateTeacher = TeacherFactory.Create(isPrivate: true);
		_context.Repositories.TeacherRepositoryMock
			.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
			.ReturnsAsync([privateTeacher]);

		var result = await _handler.HandleAsync(TestContext.Current.CancellationToken);

		result.ShouldContain(t => t.TeacherId == privateTeacher.TeacherId && t.IsPrivate);
	}
}