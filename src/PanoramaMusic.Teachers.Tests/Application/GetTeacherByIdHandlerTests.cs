using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Teachers.Application.Handlers.Teachers;
using PanoramaMusic.Teachers.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Teachers.Tests.Application;

public class GetTeacherByIdHandlerTests : IClassFixture<TeachersTestFixture>
{
	private readonly TeachersTestContext _context;
	private readonly GetTeacherByIdHandler _handler;

	public GetTeacherByIdHandlerTests(TeachersTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<GetTeacherByIdHandler>();
	}

	[Fact]
	[Trait("AC", "231UC4")]
	public async Task HandleAsync_PrivateTeacher_PrivateFlagReturnedOnSingleGet()
	{
		var privateTeacher = TeacherFactory.Create(isPrivate: true);
		_context.Repositories.TeacherRepositoryMock
			.Setup(r => r.GetByIdAsync(privateTeacher.TeacherId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(privateTeacher);

		var result = await _handler.HandleAsync(privateTeacher.TeacherId, TestContext.Current.CancellationToken);

		result.IsPrivate.ShouldBeTrue();
	}
}